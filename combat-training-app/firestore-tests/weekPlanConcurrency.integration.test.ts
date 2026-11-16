import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, disableNetwork, doc, enableNetwork, getDocFromServer, getDocsFromServer, setLogLevel, waitForPendingWrites, type Firestore } from 'firebase/firestore'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import type { RepositorySnapshot } from '../src/application/repositorySubscription'
import type { RecurringWeek, WeekPlan } from '../src/domain/week-plan/weekPlan.types'
import { generateScheduledWeek } from '../src/domain/week-plan/scheduledWeek'
import { updateCurrentWeekFromRecurring } from '../src/domain/week-plan/updateRecurringWeek'
import { currentWeekStart } from '../src/domain/week-plan/weekCalendar'
import { createFirestoreRecurringWeekRepository } from '../src/infrastructure/firebase/firestoreRecurringWeekRepository'
import { FirestoreWeekPlanRepository } from '../src/infrastructure/firebase/firestoreWeekPlanRepository'

let environment: RulesTestEnvironment
const uid = 'week-plan-concurrency', instant = '2026-11-15T10:00:00.000Z'
const stops: (() => void)[] = [], databases: Firestore[] = []
function database() {
  // RulesTestContext exposes the compat SDK; production repositories use its modular delegate.
  const db = (environment.authenticatedContext(uid, { email_verified: true }).firestore() as unknown as { _delegate: Firestore })._delegate
  databases.push(db)
  return db
}
function subscribed(db: Firestore, kind: 'recurringWeeks' | 'weekPlans', weekStart: string) {
  let latest: RepositorySnapshot<RecurringWeek | WeekPlan> | undefined
  const error = vi.fn()
  const recurring = (count: number, updatedAt: string): RecurringWeek => ({ id: 'default', createdAt: instant, updatedAt,
    items: Array.from({ length: count }, (_, index) => ({ id: String(index), kind: 'rest', day: 0 })) })
  const plan = (count: number, updatedAt: string): WeekPlan => ({ weekStart, items: [], targetCount: 3, createdAt: instant, updatedAt, editedAfterWeekEnd: false,
    schedule: recurring(count, updatedAt).items.map((item) => ({ ...item, omitted: false })) })
  const changed = (snapshot: RepositorySnapshot<RecurringWeek | WeekPlan>) => { latest = snapshot }
  if (kind === 'recurringWeeks') {
    const repository = createFirestoreRecurringWeekRepository(db, uid)
    stops.push(repository.subscribe(changed, error))
    return { save: (count: number, updatedAt: string) => repository.save(recurring(count, updatedAt)), snapshot: () => latest, value: recurring, error }
  }
  const repository = new FirestoreWeekPlanRepository(db, uid)
  stops.push(repository.subscribe(weekStart, changed, error))
  return { save: (count: number, updatedAt: string) => repository.save(plan(count, updatedAt)), snapshot: () => latest, value: plan, error }
}
beforeAll(async () => {
  if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080') throw new Error('Local demo emulator required')
  setLogLevel('silent')
  environment = await initializeTestEnvironment({ projectId: 'demo-combat-training', firestore: { host: '127.0.0.1', port: 8080,
    rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') } })
})
beforeEach(async () => { await environment.clearFirestore() })
afterEach(async () => {
  for (const stop of stops.splice(0)) stop()
  await Promise.all(databases.splice(0).map((db) => enableNetwork(db)))
})
afterAll(async () => { await environment?.cleanup() })

for (const kind of ['recurringWeeks', 'weekPlans'] as const) it.each([1, 0])(`${kind}: offline A replaces B's three slots with %i entries from a stale two-entry snapshot`, async (count) => {
  const dbA = database(), dbB = database(), weekStart = currentWeekStart()
  const b = subscribed(dbB, kind, weekStart)
  await vi.waitFor(() => expect(b.snapshot()).toMatchObject({ fromCache: false, invalidDocumentIds: [] }))
  await b.save(2, instant)
  await waitForPendingWrites(dbB)
  const a = subscribed(dbA, kind, weekStart)
  await vi.waitFor(() => expect(a.snapshot()).toMatchObject({ items: [a.value(2, instant)], fromCache: false, invalidDocumentIds: [] }))
  await disableNetwork(dbA)
  const bTime = '2026-11-15T11:00:00.000Z', aTime = '2026-11-15T12:00:00.000Z'
  await b.save(3, bTime)
  await waitForPendingWrites(dbB)
  await vi.waitFor(() => expect(b.snapshot()).toMatchObject({ items: [b.value(3, bTime)], hasPendingWrites: false }))
  expect(a.snapshot()?.items).toEqual([a.value(2, instant)])
  expect((await getDocFromServer(doc(dbB, 'users', uid, kind, kind === 'recurringWeeks' ? 'item-2' : `${weekStart}~2`))).exists()).toBe(true)

  await a.save(count, aTime)
  expect(a.snapshot()).toMatchObject({ items: [a.value(count, aTime)], invalidDocumentIds: [], hasPendingWrites: true })
  await enableNetwork(dbA)
  await waitForPendingWrites(dbA)
  await vi.waitFor(() => {
    for (const client of [a, b]) expect(client.snapshot()).toMatchObject({ items: [client.value(count, aTime)], invalidDocumentIds: [], hasPendingWrites: false, fromCache: false })
  })
  const documents = await getDocsFromServer(collection(dbB, 'users', uid, kind))
  const slotId = (position: number) => kind === 'recurringWeeks' ? `item-${position}` : `${weekStart}~${position}`
  expect(documents.docs.map((entry) => entry.id).sort()).toEqual([kind === 'recurringWeeks' ? 'default' : weekStart,
    ...Array.from({ length: count }, (_, index) => slotId(index))].sort())
  expect(documents.docs.some((entry) => entry.id === slotId(2))).toBe(false)
  const fresh = subscribed(database(), kind, weekStart)
  await vi.waitFor(() => expect(fresh.snapshot()).toMatchObject({ items: [fresh.value(count, aTime)], invalidDocumentIds: [], fromCache: false }))
  for (const client of [a, b, fresh]) expect(client.error).not.toHaveBeenCalled()
})


it('propagates recurring add, edit and delete in one offline batch and preserves manual entries on reconnect', async () => {
  const db = database(), now = new Date('2026-11-22T10:00:00Z'), weekStart = '2026-11-16'
  const repository = new FirestoreWeekPlanRepository(db, uid)
  const recurringRepository = createFirestoreRecurringWeekRepository(db, uid)
  let weeks: RepositorySnapshot<WeekPlan> | undefined
  let recurringSnapshot: RepositorySnapshot<RecurringWeek> | undefined
  const errors = vi.fn()
  stops.push(repository.subscribe(weekStart, (snapshot) => { weeks = snapshot }, errors))
  stops.push(recurringRepository.subscribe((snapshot) => { recurringSnapshot = snapshot }, errors))
  await vi.waitFor(() => { expect(weeks?.fromCache).toBe(false); expect(recurringSnapshot?.fromCache).toBe(false) })
  const initial = generateScheduledWeek(weekStart, undefined, now)
  initial.schedule!.push({ id: 'manual', kind: 'own', day: null, category: 'bag', workoutPlanId: null, planNameSnapshot: null, omitted: false })
  initial.targetCount = 1
  await repository.save(initial); await waitForPendingWrites(db)
  const source: RecurringWeek = { id: 'default', createdAt: now.toISOString(), updatedAt: now.toISOString(),
    items: [{ id: 'sunday', kind: 'club', day: 6, disciplineKey: 'muay_thai', startTime: '10:00', endTime: '12:00', parts: ['technique'], clubName: null }] }
  await disableNetwork(db)
  let next = updateCurrentWeekFromRecurring(undefined, source, initial, now)
  await repository.save(next, source)
  await vi.waitFor(() => {
    expect(weeks).toMatchObject({ hasPendingWrites: true, invalidDocumentIds: [], items: [next] })
    expect(recurringSnapshot).toMatchObject({ hasPendingWrites: true, invalidDocumentIds: [], items: [source] })
  })
  await enableNetwork(db); await waitForPendingWrites(db)
  const edit = { ...source, updatedAt: '2026-11-22T11:00:00.000Z', items: source.items.map((item) => item.kind === 'club' ? { ...item, startTime: '09:00' } : item) }
  next = updateCurrentWeekFromRecurring(source, edit, next, new Date(edit.updatedAt))
  await repository.save(next, edit); await waitForPendingWrites(db)
  expect(weeks?.items[0].schedule?.[1]).toMatchObject({ id: `${weekStart}:sunday`, startTime: '09:00' })
  const empty = { ...edit, items: [], updatedAt: '2026-11-22T12:00:00.000Z' }
  next = updateCurrentWeekFromRecurring(edit, empty, next, new Date(empty.updatedAt))
  await repository.save(next, empty); await waitForPendingWrites(db)
  expect(weeks?.items[0].schedule).toEqual(initial.schedule)
  expect((await getDocsFromServer(collection(db, 'users', uid, 'recurringWeeks'))).docs.map((document) => document.id)).toEqual(['default'])
  expect(errors).not.toHaveBeenCalled()
})

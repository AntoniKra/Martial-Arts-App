import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, disableNetwork, doc, enableNetwork, getDocFromServer, getDocsFromServer, setLogLevel, waitForPendingWrites, type Firestore } from 'firebase/firestore'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import type { RepositorySnapshot } from '../src/application/repositorySubscription'
import type { RecurringWeek, WeekPlan } from '../src/domain/week-plan/weekPlan.types'
import { changeScheduledWeek, generateScheduledWeek } from '../src/domain/week-plan/scheduledWeek'
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
  const recurring = (count: number, updatedAt: string, revision = 1): RecurringWeek => ({ revision, id: 'default', createdAt: instant, updatedAt,
    items: Array.from({ length: count }, (_, index) => ({ id: String(index), kind: 'rest', day: 0 })) })
  const plan = (count: number, updatedAt: string, revision = 1): WeekPlan => ({ revision, appliedRecurringRevision: 0, appliedRecurringIds: [], weekStart, items: [], targetCount: 3, createdAt: instant, updatedAt, editedAfterWeekEnd: false,
    schedule: recurring(count, updatedAt).items.map((item) => ({ ...item, omitted: false })) })
  const changed = (snapshot: RepositorySnapshot<RecurringWeek | WeekPlan>) => { latest = snapshot }
  if (kind === 'recurringWeeks') {
    const repository = createFirestoreRecurringWeekRepository(db, uid)
    stops.push(repository.subscribe(changed, error))
    return { save: (count: number, updatedAt: string) => repository.save({ ...recurring(count, updatedAt), revision: latest?.items[0]?.revision ?? 0 }), snapshot: () => latest, value: recurring, error }
  }
  const repository = new FirestoreWeekPlanRepository(db, uid)
  stops.push(repository.subscribe(weekStart, changed, error))
  return { save: (count: number, updatedAt: string) => repository.save({ ...plan(count, updatedAt), revision: latest?.items[0]?.revision ?? 0 }), snapshot: () => latest, value: plan, error }
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

it('rejects stale offline propagation, reconciles once, and preserves the other device manual changes', async () => {
  const dbA = database(), dbB = database(), now = new Date('2026-11-17T10:00:00Z'), weekStart = '2026-11-16'
  const a = new FirestoreWeekPlanRepository(dbA, uid), b = new FirestoreWeekPlanRepository(dbB, uid)
  let snapshotA: RepositorySnapshot<WeekPlan> | undefined, snapshotB: RepositorySnapshot<WeekPlan> | undefined
  let sourceB: RepositorySnapshot<RecurringWeek> | undefined
  const errors = vi.fn()
  stops.push(a.subscribe(weekStart, (value) => { snapshotA = value }, errors))
  stops.push(b.subscribe(weekStart, (value) => { snapshotB = value }, errors))
  stops.push(createFirestoreRecurringWeekRepository(dbB, uid).subscribe((value) => { sourceB = value }, errors))
  await vi.waitFor(() => { expect(snapshotA?.fromCache).toBe(false); expect(snapshotB?.fromCache).toBe(false) })
  const source: RecurringWeek = { id: 'default', revision: 1, createdAt: now.toISOString(), updatedAt: now.toISOString(), items: [
    { id: 'omitted', kind: 'club', day: 4, disciplineKey: 'boxing', startTime: '18:00', endTime: '19:30', parts: [], clubName: null },
    { id: 'untouched', kind: 'club', day: 6, disciplineKey: 'boxing', startTime: '18:00', endTime: '19:30', parts: [], clubName: null },
  ] }
  await a.save(generateScheduledWeek(weekStart, source, now), source)
  await waitForPendingWrites(dbA)
  await vi.waitFor(() => expect(snapshotB?.items[0]?.revision).toBe(1))
  const before = snapshotA!.items[0]
  await disableNetwork(dbA)
  const manual = changeScheduledWeek(snapshotB!.items[0], [{ ...before.schedule![0], id: 'manual-omitted', omitted: true }, before.schedule![1],
    { id: 'week-only', kind: 'own', day: null, category: 'pads', workoutPlanId: null, planNameSnapshot: null, omitted: false }], 3, now)
  await b.save(manual); await waitForPendingWrites(dbB)
  const next: RecurringWeek = { ...source, revision: 2, items: source.items.map((item) => item.kind === 'club' ? { ...item, startTime: '17:00' } : item) }
  await a.save(updateCurrentWeekFromRecurring(source, next, before, now), next, undefined, { previousRecurring: source })
  expect(snapshotA?.hasPendingWrites).toBe(true)
  await enableNetwork(dbA)
  await vi.waitFor(() => {
    expect(snapshotB?.items[0]).toMatchObject({ revision: 3, appliedRecurringRevision: 2 })
    expect(snapshotB?.hasPendingWrites).toBe(false)
    expect(sourceB?.items[0]?.revision).toBe(2)
  })
  expect(snapshotB?.items[0].schedule).toEqual(expect.arrayContaining([
    manual.schedule![0], manual.schedule![2], expect.objectContaining({ id: `${weekStart}:untouched`, startTime: '17:00' }),
  ]))
  expect(snapshotB?.items[0].schedule).toHaveLength(3)
  expect(sourceB?.items[0].items[0]).toMatchObject({ startTime: '17:00' })
  expect(errors).not.toHaveBeenCalled()
  await a.reconcile(sourceB!.items[0], now)
  await waitForPendingWrites(dbA)
  expect(snapshotA?.items[0].revision).toBe(3)
})

it('reconciles a newer recurring revision on opening the current week without re-adding a manual deletion', async () => {
  const db = database(), now = new Date('2026-11-17T10:00:00Z'), start = '2026-11-16'
  const repository = new FirestoreWeekPlanRepository(db, uid)
  let snapshot: RepositorySnapshot<WeekPlan> | undefined
  const errors = vi.fn()
  stops.push(repository.subscribe(start, (value) => { snapshot = value }, errors))
  await vi.waitFor(() => expect(snapshot?.fromCache).toBe(false))
  const source: RecurringWeek = { id: 'default', revision: 1, createdAt: now.toISOString(), updatedAt: now.toISOString(), items: [
    { id: 'deleted', kind: 'own', day: 4, category: 'bag', workoutPlanId: null, planNameSnapshot: null },
  ] }
  const week = generateScheduledWeek(start, source, now)
  week.schedule = []
  await repository.save(week, source); await waitForPendingWrites(db)
  const newer = { ...source, revision: 2, items: [...source.items, { ...source.items[0], id: 'new' }] }
  await repository.reconcile(newer, now); await waitForPendingWrites(db)
  expect(snapshot?.items[0].schedule?.map((item) => item.id)).toEqual([`${start}:new`])
  expect(snapshot?.items[0]).toMatchObject({ revision: 2, appliedRecurringRevision: 2 })
  expect(errors).not.toHaveBeenCalled()
})

for (const kind of ['recurringWeeks', 'weekPlans'] as const) it.each([1, 0])(`${kind}: an offline full-state write removes every surplus slot when saving %i entries`, async (count) => {
  const dbA = database(), dbB = database(), weekStart = currentWeekStart()
  const b = subscribed(dbB, kind, weekStart)
  await vi.waitFor(() => expect(b.snapshot()).toMatchObject({ fromCache: false, invalidDocumentIds: [] }))
  await b.save(2, instant)
  await waitForPendingWrites(dbB)
  const a = subscribed(dbA, kind, weekStart)
  await vi.waitFor(() => expect(a.snapshot()).toMatchObject({ items: [a.value(2, instant)], fromCache: false, invalidDocumentIds: [] }))
  await disableNetwork(dbA)
  const bTime = '2026-11-15T11:00:00.000Z', aTime = '2026-11-15T12:00:00.000Z'
  await environment.withSecurityRulesDisabled(async (context) => {
    const reference = context.firestore().doc(`users/${uid}/${kind}/${kind === 'recurringWeeks' ? 'item-2' : `${weekStart}~2`}`)
    const source = kind === 'recurringWeeks' ? { schemaVersion: 1, id: 'item-2', position: 2, activity: { id: 'extra', kind: 'rest', day: 0 }, createdAt: instant, updatedAt: bTime }
      : { schemaVersion: 2, weekStart, position: 2, activity: { id: 'extra', kind: 'rest', day: 0, omitted: false }, createdAt: instant, updatedAt: bTime }
    await reference.set(source)
  })
  expect(a.snapshot()?.items).toEqual([a.value(2, instant)])
  expect((await getDocFromServer(doc(dbB, 'users', uid, kind, kind === 'recurringWeeks' ? 'item-2' : `${weekStart}~2`))).exists()).toBe(true)

  await a.save(count, aTime)
  expect(a.snapshot()).toMatchObject({ items: [a.value(count, aTime, 2)], invalidDocumentIds: [], hasPendingWrites: true })
  await enableNetwork(dbA)
  await waitForPendingWrites(dbA)
  await vi.waitFor(() => {
    for (const client of [a, b]) expect(client.snapshot()).toMatchObject({ items: [client.value(count, aTime, 2)], invalidDocumentIds: [], hasPendingWrites: false, fromCache: false })
  })
  const documents = await getDocsFromServer(collection(dbB, 'users', uid, kind))
  const slotId = (position: number) => kind === 'recurringWeeks' ? `item-${position}` : `${weekStart}~${position}`
  expect(documents.docs.map((entry) => entry.id).sort()).toEqual([kind === 'recurringWeeks' ? 'default' : weekStart,
    ...Array.from({ length: count }, (_, index) => slotId(index))].sort())
  expect(documents.docs.some((entry) => entry.id === slotId(2))).toBe(false)
  const fresh = subscribed(database(), kind, weekStart)
  await vi.waitFor(() => expect(fresh.snapshot()).toMatchObject({ items: [fresh.value(count, aTime, 2)], invalidDocumentIds: [], fromCache: false }))
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
  const source: RecurringWeek = { id: 'default', revision: 1, createdAt: now.toISOString(), updatedAt: now.toISOString(),
    items: [{ id: 'sunday', kind: 'club', day: 6, disciplineKey: 'muay_thai', startTime: '10:00', endTime: '12:00', parts: ['technique'], clubName: null }] }
  await disableNetwork(db)
  let next = updateCurrentWeekFromRecurring(undefined, source, weeks!.items[0], now)
  await repository.save(next, source)
  await vi.waitFor(() => {
    expect(weeks).toMatchObject({ hasPendingWrites: true, invalidDocumentIds: [], items: [{ ...next, revision: 2 }] })
    expect(recurringSnapshot).toMatchObject({ hasPendingWrites: true, invalidDocumentIds: [], items: [source] })
  })
  await enableNetwork(db); await waitForPendingWrites(db)
  const edit = { ...source, revision: 2, updatedAt: '2026-11-22T11:00:00.000Z', items: source.items.map((item) => item.kind === 'club' ? { ...item, startTime: '09:00' } : item) }
  next = updateCurrentWeekFromRecurring(source, edit, weeks!.items[0], new Date(edit.updatedAt))
  await repository.save({ ...next, revision: weeks?.items[0]?.revision }, edit); await waitForPendingWrites(db)
  expect(weeks?.items[0].schedule?.[1]).toMatchObject({ id: `${weekStart}:sunday`, startTime: '09:00' })
  const empty = { ...edit, revision: 3, items: [], updatedAt: '2026-11-22T12:00:00.000Z' }
  next = updateCurrentWeekFromRecurring(edit, empty, weeks!.items[0], new Date(empty.updatedAt))
  await repository.save({ ...next, revision: weeks?.items[0]?.revision }, empty); await waitForPendingWrites(db)
  expect(weeks?.items[0].schedule).toEqual(initial.schedule)
  expect((await getDocsFromServer(collection(db, 'users', uid, 'recurringWeeks'))).docs.map((document) => document.id)).toEqual(['default'])
  expect(errors).not.toHaveBeenCalled()
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Firestore } from 'firebase/firestore'
import { FirestoreWeekPlanRepository } from './firestoreWeekPlanRepository'
import type { WeekPlan } from '@/domain/week-plan/weekPlan.types'
import { storedWeekPlanDocuments } from './weekPlanDocumentSchema'

type Snapshot = { docs: unknown[]; metadata: { fromCache: boolean; hasPendingWrites: boolean } }
const sdk = vi.hoisted(() => ({
  change: null as ((snapshot: Snapshot) => void) | null, error: null as ((error: Error) => void) | null,
  stop: vi.fn(), query: vi.fn((path: string, condition: unknown) => ({ path, condition })),
  set: vi.fn<() => Promise<void>>(), batchSet: vi.fn(), batchDelete: vi.fn(), read: vi.fn(),
}))
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...path: string[]) => path.join('/'), doc: (path: string, id: string) => `${path}/${id}`,
  query: sdk.query, where: (...args: unknown[]) => args,
  onSnapshot: (_query: unknown, _options: unknown, change: typeof sdk.change, error: typeof sdk.error) => {
    sdk.change = change; sdk.error = error; return sdk.stop
  }, getDocsFromServer: sdk.read, setDoc: sdk.set, writeBatch: () => ({ set: sdk.batchSet, delete: sdk.batchDelete, commit: sdk.set }),
}))
const instant = '2026-11-10T10:00:00.000Z'
const plan: WeekPlan = { weekStart: '2026-11-09', items: [{ id: 'one', kind: 'category', category: 'bag' }],
  createdAt: instant, updatedAt: instant, editedAfterWeekEnd: false }
function emit(items: unknown[], fromCache = false, pending = false, ids?: string[]) {
  items = items.map((item) => {
    const week = item as WeekPlan
    const path = `users/athlete/weekPlans/${week.weekStart}`
    const header = [...sdk.batchSet.mock.calls, ...sdk.set.mock.calls].filter((args) => args[0] === path).sort((a, b) => (a[1]?.revision ?? 0) - (b[1]?.revision ?? 0)).at(-1)?.[1] as WeekPlan | undefined
    return pending && header ? { ...week, revision: header.revision, ...(week.schedule ? { appliedRecurringRevision: header.appliedRecurringRevision, appliedRecurringIds: header.appliedRecurringIds } : {}) } : week
  })
  sdk.change?.({ docs: items.flatMap((item, index) => {
    let documents: { id: string; data: unknown }[]
    try { documents = storedWeekPlanDocuments(item as WeekPlan) } catch { documents = [{ id: (item as WeekPlan).weekStart, data: { ...(item as object), schemaVersion: 1 } }] }
    return documents.map((document) => ({ id: ids?.[index] ?? document.id, data: () => document.data, metadata: { hasPendingWrites: pending } }))
  }),
  metadata: { fromCache, hasPendingWrites: pending } })
}
const create = () => new FirestoreWeekPlanRepository({} as Firestore, 'athlete')
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(instant)); sdk.set.mockImplementation(() => new Promise(() => {})) })
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

describe('date-keyed weekly repository', () => {
  it('validates both snapshots against the Warsaw week at the start of a recurring save', async () => {
    const operationTime = new Date('2026-11-22T22:59:59.999Z')
    vi.setSystemTime(new Date('2026-11-22T23:00:00.000Z'))
    const repository = create(), current = { ...plan, weekStart: '2026-11-16', items: [], schedule: [], targetCount: 0, updatedAt: operationTime.toISOString() }
    const future = { ...current, weekStart: '2026-11-23' }
    const recurring = { id: 'default' as const, items: [], createdAt: instant, updatedAt: current.updatedAt }
    repository.subscribe(current.weekStart, vi.fn(), vi.fn())
    emit([current, future])
    const saving = repository.save(future, recurring, current, { operationTime })
    emit([current, future], true, true)
    await saving
    expect(sdk.batchSet).toHaveBeenCalledWith('users/athlete/weekPlans/2026-11-16', expect.objectContaining({ editedAfterWeekEnd: false }))
    await expect(repository.save(current)).rejects.toThrow('Historical edit')
  })

  it('writes recurring records and two complete weeks atomically, resolving after both local weeks arrive', async () => {
    const repository = create()
    repository.subscribe(plan.weekStart, vi.fn(), vi.fn())
    emit([plan])
    const current = { ...plan, items: [], schedule: [], targetCount: 0 }
    const future = { ...current, weekStart: '2026-11-16' }
    const recurring = { id: 'default' as const, items: [], createdAt: instant, updatedAt: instant }
    let resolved = false
    const saving = repository.save(future, recurring, current).then(() => { resolved = true })
    expect(sdk.set).toHaveBeenCalledOnce()
    expect(sdk.batchSet).toHaveBeenCalledWith('users/athlete/recurringWeeks/default', expect.objectContaining({ itemCount: 0 }))
    expect(sdk.batchSet).toHaveBeenCalledTimes(3)
    expect(sdk.batchDelete).toHaveBeenCalledTimes(42)
    emit([future], true, true)
    await Promise.resolve(); expect(resolved).toBe(false)
    emit([future, current], true, true)
    await saving; expect(resolved).toBe(true)
  })
  it('removes all surplus entry documents in the same batch when a fourteen-item plan is shortened or cleared', async () => {
    const repository = create()
    repository.subscribe(plan.weekStart, vi.fn(), vi.fn())
    const scheduled: WeekPlan = { ...plan, items: [], targetCount: 14,
      schedule: Array.from({ length: 14 }, (_, index) => ({ id: String(index), kind: 'own', day: null, category: 'bag', workoutPlanId: null, planNameSnapshot: null, omitted: false })) }
    emit([scheduled])
    const shortened = { ...scheduled, schedule: scheduled.schedule!.slice(0, 1), updatedAt: '2026-11-10T11:00:00.000Z' }
    const saving = repository.save(shortened)
    expect(sdk.batchSet).toHaveBeenCalledTimes(2)
    expect(sdk.batchDelete).toHaveBeenCalledTimes(13)
    for (let index = 1; index < 14; index++) expect(sdk.batchDelete).toHaveBeenCalledWith(`users/athlete/weekPlans/${plan.weekStart}~${index}`)
    expect(sdk.set).toHaveBeenCalledOnce()
    emit([shortened], true, true)
    await saving
    const empty = { ...shortened, schedule: [], updatedAt: '2026-11-10T12:00:00.000Z' }
    const clearing = repository.save(empty)
    expect(sdk.batchDelete).toHaveBeenCalledTimes(27)
    for (let index = 0; index < 14; index++) expect(sdk.batchDelete).toHaveBeenNthCalledWith(14 + index, `users/athlete/weekPlans/${plan.weekStart}~${index}`)
    expect(sdk.set).toHaveBeenCalledTimes(2)
    emit([empty], true, true)
    await clearing
  })
  it('saves v2 from the local snapshot and reads v1 alongside it without rewriting', async () => {
    const repository = create(), change = vi.fn()
    repository.subscribe(plan.weekStart, change, vi.fn())
    emit([plan])
    const scheduled: WeekPlan = { ...plan, weekStart: '2026-11-16', items: [], schedule: [{ id: 'one', kind: 'own', day: null, category: 'bag', workoutPlanId: null, planNameSnapshot: null, omitted: false }], targetCount: 3 }
    const saved = repository.save(scheduled)
    emit([plan, scheduled], true, true)
    await saved
    for (const document of storedWeekPlanDocuments(scheduled)) expect(sdk.batchSet).toHaveBeenCalledWith(`users/athlete/weekPlans/${document.id}`, expect.objectContaining(document.data))
    expect(change.mock.lastCall?.[0].items).toEqual([plan, expect.objectContaining({ ...scheduled, revision: 1 })])
    expect(sdk.set).toHaveBeenCalledOnce()
  })
  it('queries the owner range including the current and twelve previous weeks and all future weeks', () => {
    const repository = create(), change = vi.fn()
    const stop = repository.subscribe(plan.weekStart, change, vi.fn())
    expect(sdk.query).toHaveBeenCalledWith('users/athlete/weekPlans', ['weekStart', '>=', '2026-08-17'])
    emit([], true)
    expect(change.mock.lastCall?.[0]).toMatchObject({ complete: false, rangeStart: '2026-08-17' })
    emit([])
    emit([], true)
    expect(change.mock.lastCall?.[0]).toMatchObject({ complete: true, fromCache: true })
    stop()
    expect(sdk.stop).toHaveBeenCalledOnce()
  })
  it('blocks writes before any read or for an absent document in an incomplete cache', async () => {
    const repository = create()
    await expect(repository.save(plan)).rejects.toThrow('safely available')
    repository.subscribe(plan.weekStart, vi.fn(), vi.fn())
    emit([], true)
    await expect(repository.save(plan)).rejects.toThrow('safely available')
    expect(sdk.set).not.toHaveBeenCalled()
  })
  it('edits a validated cached plan offline and resolves from the local snapshot, not the server', async () => {
    const repository = create(), change = vi.fn()
    repository.subscribe(plan.weekStart, change, vi.fn())
    emit([plan], true)
    const changed = { ...plan, items: [], updatedAt: '2026-11-10T11:00:00.000Z' }
    const saved = repository.save(changed)
    emit([changed], true, true)
    await expect(saved).resolves.toBeUndefined()
    expect(sdk.set).toHaveBeenCalledWith('users/athlete/weekPlans/2026-11-09', { ...changed, schemaVersion: 1, revision: 1 })
    expect(change.mock.lastCall?.[0]).toMatchObject({ hasPendingWrites: true, pendingIds: new Set([plan.weekStart]), complete: false })
    emit([changed])
    expect(change.mock.lastCall?.[0].pendingIds).toEqual(new Set())
  })
  it('creates an absent document only after a complete snapshot', async () => {
    const repository = create()
    repository.subscribe(plan.weekStart, vi.fn(), vi.fn())
    emit([])
    const saved = repository.save(plan)
    emit([plan], true, true)
    await saved
    expect(sdk.set).toHaveBeenCalledOnce()
  })
  it('filters malformed and identity-mismatched documents and refuses to overwrite them', async () => {
    const repository = create(), change = vi.fn()
    repository.subscribe(plan.weekStart, change, vi.fn())
    emit([{ ...plan, editedAfterWeekEnd: 'bad' }, plan], false, false, [plan.weekStart, '2026-11-16'])
    expect(change.mock.lastCall?.[0]).toMatchObject({ items: [], invalidDocumentIds: [plan.weekStart, '2026-11-16'] })
    await expect(repository.save(plan)).rejects.toThrow('safely available')
    expect(sdk.set).not.toHaveBeenCalled()
  })
  it('preserves creation time and a sticky historical flag and validates writes before the SDK', async () => {
    const repository = create()
    repository.subscribe(plan.weekStart, vi.fn(), vi.fn())
    emit([plan])
    await expect(repository.save({ ...plan, createdAt: '2026-11-10T11:00:00.000Z' })).rejects.toThrow('history')
    await expect(repository.save({ ...plan, items: [...plan.items, ...plan.items] })).rejects.toThrow()
    const old = { ...plan, weekStart: '2026-11-02', editedAfterWeekEnd: true }
    emit([old])
    await expect(repository.save({ ...old, editedAfterWeekEnd: false })).rejects.toThrow('history')
    emit([])
    await expect(repository.save({ ...old, editedAfterWeekEnd: false })).rejects.toThrow('Historical')
    expect(sdk.set).not.toHaveBeenCalled()
  })
  it('recovers the first rejection silently and reports a second server rejection after local success', async () => {
    const rejectServer: ((error: Error) => void)[] = []
    sdk.set.mockImplementation(() => new Promise((_resolve, reject) => { rejectServer.push(reject) }))
    sdk.read.mockImplementation(async (path: unknown) => ({ metadata: { hasPendingWrites: false }, docs: typeof path === 'string' ? [] : [
      { id: plan.weekStart, data: () => ({ ...plan, schemaVersion: 1, revision: 1 }) },
    ] }))
    const repository = create(), error = vi.fn()
    repository.subscribe(plan.weekStart, vi.fn(), error)
    emit([plan])
    const changed = { ...plan, items: [] }
    const saved = repository.save(changed)
    emit([changed], true, true)
    await saved
    rejectServer[0](new Error('permission-denied'))
    await vi.waitFor(() => expect(sdk.set).toHaveBeenCalledTimes(2))
    expect(error).not.toHaveBeenCalled()
    emit([{ ...changed, schedule: [], targetCount: 0, revision: 2 }], true, true)
    rejectServer[1](new Error('permission-denied'))
    await vi.waitFor(() => expect(error).toHaveBeenCalledOnce())
    emit([])
    expect(error).toHaveBeenCalledTimes(2)
    await expect(repository.save(plan)).rejects.toThrow('safely available')
  })
  it('rejects a pending local operation on listener failure or account cleanup', async () => {
    const repository = create(), error = vi.fn()
    const stop = repository.subscribe(plan.weekStart, vi.fn(), error)
    emit([])
    const saved = repository.save(plan)
    sdk.error?.(new Error('offline listener failed'))
    await expect(saved).rejects.toThrow('listener failed')
    stop()
    const second = create()
    const stopSecond = second.subscribe(plan.weekStart, vi.fn(), vi.fn())
    emit([])
    const interrupted = second.save(plan)
    stopSecond()
    await expect(interrupted).rejects.toThrow('closed')
    await expect(second.save(plan)).rejects.toThrow('safely available')
  })
  it('replaces the query range on week rollover without retaining documents or account data', async () => {
    const repository = create()
    const stop = repository.subscribe(plan.weekStart, vi.fn(), vi.fn())
    emit([plan])
    stop()
    const next = vi.fn()
    repository.subscribe('2026-11-16', next, vi.fn())
    expect(sdk.query).toHaveBeenLastCalledWith('users/athlete/weekPlans', ['weekStart', '>=', '2026-08-24'])
    emit([], true)
    expect(next.mock.lastCall?.[0]).toMatchObject({ items: [], complete: false })
    await expect(repository.save(plan)).rejects.toThrow('safely available')
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Firestore } from 'firebase/firestore'
import { FirestoreWeekPlanRepository } from './firestoreWeekPlanRepository'
import type { WeekPlan } from '@/domain/week-plan/weekPlan.types'

type Snapshot = { docs: unknown[]; metadata: { fromCache: boolean; hasPendingWrites: boolean } }
const sdk = vi.hoisted(() => ({
  change: null as ((snapshot: Snapshot) => void) | null, error: null as ((error: Error) => void) | null,
  stop: vi.fn(), query: vi.fn((path: string, condition: unknown) => ({ path, condition })),
  set: vi.fn<() => Promise<void>>(),
}))
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...path: string[]) => path.join('/'), doc: (path: string, id: string) => `${path}/${id}`,
  query: sdk.query, where: (...args: unknown[]) => args,
  onSnapshot: (_query: unknown, _options: unknown, change: typeof sdk.change, error: typeof sdk.error) => {
    sdk.change = change; sdk.error = error; return sdk.stop
  }, setDoc: sdk.set,
}))
const instant = '2026-11-10T10:00:00.000Z'
const plan: WeekPlan = { weekStart: '2026-11-09', items: [{ id: 'one', kind: 'category', category: 'bag' }],
  createdAt: instant, updatedAt: instant, editedAfterWeekEnd: false }
function emit(items: unknown[], fromCache = false, pending = false, ids?: string[]) {
  sdk.change?.({ docs: items.map((item, index) => ({ id: ids?.[index] ?? (item as WeekPlan).weekStart,
    data: () => ({ ...(item as object), schemaVersion: 1 }), metadata: { hasPendingWrites: pending } })),
  metadata: { fromCache, hasPendingWrites: pending } })
}
const create = () => new FirestoreWeekPlanRepository({} as Firestore, 'athlete')
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(instant)); sdk.set.mockImplementation(() => new Promise(() => {})) })
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

describe('date-keyed weekly repository', () => {
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
    expect(sdk.set).toHaveBeenCalledWith('users/athlete/weekPlans/2026-11-09', { ...changed, schemaVersion: 1 })
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
  it('reports late rejection after local success and never reverts to apparent success on rollback', async () => {
    let rejectServer!: (error: Error) => void
    sdk.set.mockImplementation(() => new Promise((_resolve, reject) => { rejectServer = reject }))
    const repository = create(), error = vi.fn()
    repository.subscribe(plan.weekStart, vi.fn(), error)
    emit([])
    const saved = repository.save(plan)
    emit([plan], true, true)
    await saved
    rejectServer(new Error('permission-denied'))
    await Promise.resolve()
    expect(error).toHaveBeenCalledOnce()
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

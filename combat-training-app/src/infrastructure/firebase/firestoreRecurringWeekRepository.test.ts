import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Firestore } from 'firebase/firestore'
import type { RecurringWeek } from '@/domain/week-plan/weekPlan.types'
import { recurringWeekRecords } from './recurringWeekDocumentSchema'
import { createFirestoreRecurringWeekRepository } from './firestoreRecurringWeekRepository'

const sdk = vi.hoisted(() => ({ change: null as ((snapshot: unknown) => void) | null, stop: vi.fn(), set: vi.fn(), remove: vi.fn(), commit: vi.fn<() => Promise<void>>() }))
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...parts: string[]) => parts.join('/'), doc: (path: string, id: string) => `${path}/${id}`,
  onSnapshot: (_path: unknown, _options: unknown, change: typeof sdk.change) => { sdk.change = change; return sdk.stop },
  writeBatch: () => ({ set: sdk.set, delete: sdk.remove, commit: sdk.commit }),
}))
const instant = '2026-11-10T10:00:00.000Z'
const week: RecurringWeek = { id: 'default', items: [{ id: 'club', kind: 'club', day: 1, disciplineKey: 'muay_thai', startTime: '19:00', endTime: '20:30', parts: ['technique'], clubName: null }], createdAt: instant, updatedAt: instant }
function emit(records = recurringWeekRecords(week), pending = false) {
  records = records.map((record) => {
    const value = sdk.set.mock.calls.filter((args) => args[0] === `users/athlete/recurringWeeks/${record.id}`).at(-1)?.[1]
    return pending && record.id === 'default' && value ? { ...record, revision: value.revision } : record
  })
  sdk.change?.({ docs: records.map((record) => ({ id: record.id, data: () => record, metadata: { hasPendingWrites: pending } })), metadata: { hasPendingWrites: pending, fromCache: pending } })
}
beforeEach(() => { vi.clearAllMocks(); sdk.commit.mockImplementation(() => new Promise(() => {})) })
describe('recurring week repository', () => {
  it('saves all records atomically, resolves locally offline, and deletes removed slots', async () => {
    const repository = createFirestoreRecurringWeekRepository({} as Firestore, 'athlete'), change = vi.fn()
    const stop = repository.subscribe(change, vi.fn())
    emit([])
    const saved = repository.save(week)
    emit(recurringWeekRecords(week), true)
    await saved
    expect(sdk.commit).toHaveBeenCalledOnce()
    expect(change.mock.lastCall?.[0]).toMatchObject({ items: [week], hasPendingWrites: true })
    const empty = { ...week, items: [], updatedAt: '2026-11-11T10:00:00.000Z' }
    const removed = repository.save(empty)
    emit(recurringWeekRecords(empty), true)
    await removed
    expect(sdk.remove).toHaveBeenCalledWith('users/athlete/recurringWeeks/item-0')
    stop(); expect(sdk.stop).toHaveBeenCalledOnce()
  })
  it('keeps a late server rejection visible through rollback and requires a retry', async () => {
    let rejectServer!: (error: Error) => void
    sdk.commit.mockImplementation(() => new Promise((_resolve, reject) => { rejectServer = reject }))
    const repository = createFirestoreRecurringWeekRepository({} as Firestore, 'athlete'), error = vi.fn()
    repository.subscribe(vi.fn(), error); emit([])
    const saved = repository.save(week); emit(recurringWeekRecords(week), true); await saved
    rejectServer(new Error('Denied'))
    await vi.waitFor(() => expect(error).toHaveBeenCalled())
    emit([])
    expect(error.mock.lastCall?.[0].message).toContain('retry')
    await expect(repository.save(week)).rejects.toThrow('available')
  })
  it('marks incomplete records as invalid and never presents them as an empty template', () => {
    const repository = createFirestoreRecurringWeekRepository({} as Firestore, 'athlete'), change = vi.fn()
    repository.subscribe(change, vi.fn()); emit(recurringWeekRecords(week).slice(0, 1))
    expect(change.mock.lastCall?.[0]).toMatchObject({ items: [], invalidDocumentIds: ['default'] })
  })
})

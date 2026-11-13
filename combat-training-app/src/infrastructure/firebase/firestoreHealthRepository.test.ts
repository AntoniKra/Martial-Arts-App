import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Firestore } from 'firebase/firestore'
import type { AthleteProfile, BodyWeight } from '@/domain/profile/profile.types'
import { createFirestoreHealthRepositories } from './firestoreHealthRepository'

type Change = (snapshot: unknown) => void
const sdk = vi.hoisted(() => ({
  listeners: new Map<string, Change>(), errors: new Map<string, (error: Error) => void>(),
  set: vi.fn<() => Promise<void>>(), remove: vi.fn<() => Promise<void>>(),
  read: vi.fn<() => Promise<{ docs: { id: string }[] }>>(),
  commit: vi.fn<(operations: unknown[]) => Promise<void>>(), batches: [] as unknown[][],
}))
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...path: string[]) => path.join('/'),
  doc: (_db: unknown, ...path: string[]) => path.join('/'),
  onSnapshot: (path: string, _options: unknown, change: Change, error: (error: Error) => void) => {
    sdk.listeners.set(path, change); sdk.errors.set(path, error)
    return () => { sdk.listeners.delete(path); sdk.errors.delete(path) }
  },
  setDoc: sdk.set, deleteDoc: sdk.remove, getDocsFromServer: sdk.read,
  writeBatch: () => {
    const operations: unknown[] = []
    return { delete: (path: string) => operations.push(['delete', path]),
      update: (path: string, fields: unknown) => operations.push(['update', path, fields]),
      commit: () => { sdk.batches.push(operations); return sdk.commit(operations) } }
  },
}))

const uid = 'athlete', profilePath = 'users/athlete', weightPath = `${profilePath}/bodyWeights`
const instant = '2026-11-13T09:00:00.000Z'
const profile: AthleteProfile = { healthDataConsent: { grantedAt: instant, noticeVersion: '2026-11', adultConfirmed: true },
  weightClassLabel: '−77 kg', createdAt: instant, updatedAt: instant }
const weight: BodyWeight = { date: '2026-11-13', weightKg: 76.4, createdAt: instant, updatedAt: instant }
const metadata = (fromCache = false, hasPendingWrites = false) => ({ fromCache, hasPendingWrites })
function emitProfile(value: unknown = profile, fromCache = false, pending = false) {
  sdk.listeners.get(profilePath)?.({ id: uid, exists: () => value !== null,
    data: () => value && { ...value, schemaVersion: 1 }, metadata: metadata(fromCache, pending) })
}
function emitWeights(values: unknown[] = [], fromCache = false, pending = false, ids?: string[]) {
  sdk.listeners.get(weightPath)?.({ docs: values.map((value, index) => ({ id: ids?.[index] ?? (value as BodyWeight).date,
    data: () => ({ ...value as object, schemaVersion: 1 }), metadata: metadata(fromCache, pending) })), metadata: metadata(fromCache, pending) })
}
function subscribed() {
  const repositories = createFirestoreHealthRepositories({} as Firestore, uid)
  const profileChange = vi.fn(), weightChange = vi.fn(), error = vi.fn()
  const stopProfile = repositories.profile.subscribe(profileChange, error)
  const stopWeights = repositories.bodyWeights.subscribe(weightChange, error)
  emitProfile(); emitWeights()
  return { repositories, profileChange, weightChange, error, stopProfile, stopWeights }
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(instant))
  sdk.set.mockImplementation(() => new Promise(() => {}))
  sdk.remove.mockImplementation(() => new Promise(() => {}))
  sdk.read.mockResolvedValue({ docs: [] }); sdk.commit.mockResolvedValue()
})
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); sdk.listeners.clear(); sdk.errors.clear(); sdk.batches.length = 0 })

describe('health repository local writes and subscriptions', () => {
  it('confirms pending profile and weight writes from local snapshots before server acknowledgement', async () => {
    const { repositories, weightChange, profileChange } = subscribed()
    const saveWeight = repositories.bodyWeights.save(weight)
    emitWeights([weight], true, true)
    await saveWeight
    expect(weightChange.mock.lastCall?.[0]).toMatchObject({ hasPendingWrites: true, pendingIds: new Set([weight.date]) })
    expect(sdk.set).toHaveBeenCalledWith(`${weightPath}/${weight.date}`, { ...weight, schemaVersion: 1 })
    const changed = { ...profile, weightClassLabel: '+91 kg' }
    const saveProfile = repositories.profile.save(changed)
    emitProfile(changed, true, true)
    await saveProfile
    expect(profileChange.mock.lastCall?.[0].hasPendingWrites).toBe(true)
    const removed = repositories.bodyWeights.delete(weight.date)
    emitWeights([], true, true)
    await removed
  })
  it('blocks creation in an incomplete cache, permits cached edits, and preserves createdAt', async () => {
    const repositories = createFirestoreHealthRepositories({} as Firestore, uid)
    repositories.profile.subscribe(vi.fn(), vi.fn()); repositories.bodyWeights.subscribe(vi.fn(), vi.fn())
    emitProfile(null, true); emitWeights([], true)
    await expect(repositories.profile.save(profile)).rejects.toThrow('safely available')
    emitProfile(profile, true); emitWeights([weight], true)
    const changed = { ...weight, weightKg: 77 }
    const saved = repositories.bodyWeights.save(changed)
    emitWeights([changed], true, true)
    await saved
    await expect(repositories.bodyWeights.save({ ...changed, createdAt: '2026-11-12T09:00:00.000Z' })).rejects.toThrow('Creation')
    await expect(repositories.bodyWeights.save({ ...changed, date: '2026-11-12' })).rejects.toThrow('safely available')
  })
  it('rejects invalid, future and unconsented writes before invoking the SDK', async () => {
    const { repositories } = subscribed()
    await expect(repositories.bodyWeights.save({ ...weight, weightKg: 76.44 })).rejects.toThrow()
    await expect(repositories.bodyWeights.save({ ...weight, date: '2026-11-14' })).rejects.toThrow('date')
    emitProfile({ ...profile, healthDataConsent: null, weightClassLabel: null })
    await expect(repositories.bodyWeights.save(weight)).rejects.toThrow('consent')
    expect(sdk.set).not.toHaveBeenCalled()
  })
  it('filters invalid and identity-mismatched documents and blocks overwriting them', async () => {
    const { repositories, weightChange } = subscribed()
    emitWeights([{ ...weight, weightKg: 0 }, weight], false, false, [weight.date, '2026-11-12'])
    expect(weightChange.mock.lastCall?.[0]).toMatchObject({ items: [], invalidDocumentIds: [weight.date, '2026-11-12'] })
    await expect(repositories.bodyWeights.save(weight)).rejects.toThrow('safely available')
  })
  it('reports late rejection after local success until resubscription and closes pending operations on sign out', async () => {
    let reject!: (error: Error) => void
    sdk.set.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail }))
    const { repositories, error, stopWeights } = subscribed()
    const saved = repositories.bodyWeights.save(weight)
    emitWeights([weight], true, true); await saved
    reject(new Error('permission-denied')); await Promise.resolve()
    expect(error).toHaveBeenCalledOnce()
    emitWeights([])
    expect(error).toHaveBeenCalledTimes(2)
    await expect(repositories.bodyWeights.save(weight)).rejects.toThrow('safely available')
    stopWeights()
    repositories.bodyWeights.subscribe(vi.fn(), error); emitWeights([])
    const pending = repositories.bodyWeights.save(weight)
    const rejected = expect(pending).rejects.toThrow('closed')
    // Cleanup is the same path used by the account provider and clearFirestoreCache.
    sdk.errors.get(weightPath)?.(new Error('closed'))
    await rejected
  })
})

describe('online consent withdrawal', () => {
  it.each([0, 1, 499, 500, 1200])('awaits server read and each batch, clearing consent last for %s documents', async (count) => {
    const { repositories } = subscribed()
    sdk.read.mockResolvedValueOnce({ docs: Array.from({ length: count }, (_, index) => ({ id: String(index) })) })
    await repositories.profile.withdrawConsent()
    const operations = sdk.batches.flat()
    expect(operations.slice(0, count)).toEqual(Array.from({ length: count }, (_, index) => ['delete', `${weightPath}/${index}`]))
    expect(operations.at(-1)).toEqual(['update', profilePath, { healthDataConsent: null, weightClassLabel: null, updatedAt: instant }])
    expect(sdk.batches.every((batch) => batch.length <= 499)).toBe(true)
    expect(sdk.read.mock.invocationCallOrder[0]).toBeLessThan(sdk.commit.mock.invocationCallOrder[0])
  })
  it('leaves all data intact on server-read failure', async () => {
    const { repositories } = subscribed()
    sdk.read.mockRejectedValueOnce(new Error('offline'))
    await expect(repositories.profile.withdrawConsent()).rejects.toThrow('offline')
    expect(sdk.batches).toEqual([])
  })
  it('retains consent on interrupted deletion and can retry with the remaining server documents', async () => {
    const { repositories } = subscribed()
    sdk.read.mockResolvedValueOnce({ docs: Array.from({ length: 500 }, (_, index) => ({ id: String(index) })) })
    sdk.commit.mockResolvedValueOnce().mockRejectedValueOnce(new Error('interrupted'))
    await expect(repositories.profile.withdrawConsent()).rejects.toThrow('interrupted')
    expect(sdk.batches[0]).toHaveLength(499)
    sdk.read.mockResolvedValueOnce({ docs: [{ id: '499' }] })
    await repositories.profile.withdrawConsent()
    expect(sdk.batches.at(-1)).toEqual([['delete', `${weightPath}/499`],
      ['update', profilePath, { healthDataConsent: null, weightClassLabel: null, updatedAt: instant }]])
  })
  it('blocks concurrent local writes and waits for each committed batch before preparing the next', async () => {
    const { repositories } = subscribed()
    sdk.read.mockResolvedValueOnce({ docs: Array.from({ length: 500 }, (_, index) => ({ id: String(index) })) })
    let finish!: () => void
    sdk.commit.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    const withdrawal = repositories.profile.withdrawConsent()
    await Promise.resolve()
    expect(sdk.batches).toHaveLength(1)
    await expect(repositories.bodyWeights.save(weight)).rejects.toThrow('consent')
    await expect(repositories.profile.save(profile)).rejects.toThrow('progress')
    finish(); await withdrawal
    expect(sdk.batches).toHaveLength(2)
  })
})

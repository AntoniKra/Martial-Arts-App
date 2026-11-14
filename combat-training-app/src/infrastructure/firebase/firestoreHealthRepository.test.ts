import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Firestore } from 'firebase/firestore'
import type { AthleteProfile, BodyWeight } from '@/domain/profile/profile.types'
import { createFirestoreHealthRepositories } from './firestoreHealthRepository'
import type { WellbeingEntry } from '@/domain/wellbeing/wellbeing'

type Change = (snapshot: unknown) => void
const sdk = vi.hoisted(() => ({
  listeners: new Map<string, Change>(), errors: new Map<string, (error: Error) => void>(),
  set: vi.fn<() => Promise<void>>(), remove: vi.fn<() => Promise<void>>(),
  read: vi.fn<() => Promise<{ docs: { id: string }[] }>>(),
  commit: vi.fn<(operations: unknown[]) => Promise<void>>(), batches: [] as unknown[][],
  lock: vi.fn<() => Promise<void>>(), profileData: {} as Record<string, unknown>,
  transactionUpdates: [] as Record<string, unknown>[],
}))
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...path: string[]) => path.join('/'),
  doc: (_db: unknown, ...path: string[]) => path.join('/'),
  onSnapshot: (path: string, _options: unknown, change: Change, error: (error: Error) => void) => {
    sdk.listeners.set(path, change); sdk.errors.set(path, error)
    return () => { sdk.listeners.delete(path); sdk.errors.delete(path) }
  },
  setDoc: sdk.set, deleteDoc: sdk.remove, getDocsFromServer: sdk.read,
  runTransaction: async (_db: unknown, action: (transaction: { get: () => Promise<unknown>; update: (path: string, fields: Record<string, unknown>) => void }) => Promise<unknown>) => {
    const result = await action({ get: async () => ({ exists: () => true, data: () => sdk.profileData }),
      update: (_path, fields) => { sdk.transactionUpdates.push(fields); sdk.profileData = { ...sdk.profileData, ...fields } } })
    await sdk.lock()
    return result
  },
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
  sdk.profileData = value ? { ...value, schemaVersion: 1 } : {}
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
const browserEvents = new EventTarget()
const lockId = 'ce3371c8-85bb-4ae1-88ac-56a10077fb0f'
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(instant))
  vi.stubGlobal('navigator', { onLine: true })
  vi.stubGlobal('addEventListener', browserEvents.addEventListener.bind(browserEvents))
  vi.stubGlobal('removeEventListener', browserEvents.removeEventListener.bind(browserEvents))
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(lockId)
  sdk.set.mockImplementation(() => new Promise(() => {}))
  sdk.remove.mockImplementation(() => new Promise(() => {}))
  sdk.read.mockResolvedValue({ docs: [] }); sdk.commit.mockResolvedValue()
  sdk.lock.mockResolvedValue()
})
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); sdk.listeners.clear(); sdk.errors.clear(); sdk.batches.length = 0; sdk.transactionUpdates.length = 0 })

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

describe('wellbeing repository', () => {
  const path = `${profilePath}/readiness`
  const entry: WellbeingEntry = { date: '2026-11-13', questionsVersion: 1, sleep: 3, energy: 3, soreness: 3, stress: 3, note: null, createdAt: instant, updatedAt: instant }
  const consented = { ...profile, wellbeingConsent: profile.healthDataConsent }
  function emitEntries(entries: WellbeingEntry[], pending = false, fromCache = false) {
    sdk.listeners.get(path)?.({ docs: entries.map((value) => ({ id: value.date, data: () => ({ ...value, schemaVersion: 1 }), metadata: metadata(fromCache, pending) })), metadata: metadata(fromCache, pending) })
  }
  it('requires separate consent, accepts only today, and confirms offline writes from local snapshots', async () => {
    const { repositories } = subscribed(), change = vi.fn()
    repositories.wellbeing.subscribe(change, vi.fn()); emitEntries([])
    await expect(repositories.wellbeing.save(entry)).rejects.toThrow('consent')
    emitProfile(consented)
    await expect(repositories.wellbeing.save({ ...entry, date: '2026-11-12' })).rejects.toThrow('today')
    await expect(repositories.wellbeing.save({ ...entry, date: '2026-11-14' })).rejects.toThrow('today')
    await expect(repositories.wellbeing.save({ ...entry, sleep: 0 })).rejects.toThrow()
    const saved = repositories.wellbeing.save(entry)
    emitEntries([entry], true)
    await expect(saved).resolves.toBeUndefined()
    expect(change.mock.lastCall?.[0].hasPendingWrites).toBe(true)
    await expect(repositories.wellbeing.save({ ...entry, createdAt: '2026-11-12T09:00:00.000Z' })).rejects.toThrow('Creation')
    await expect(repositories.profile.save({ ...consented, wellbeingConsent: null })).rejects.toThrow('Withdraw')
  })
  it.each([0, 1, 499, 500, 1200])('deletes all %s entries and clears only wellbeing consent in the last batch', async (count) => {
    const { repositories } = subscribed(); emitProfile(consented)
    sdk.read.mockResolvedValue({ docs: Array.from({ length: count }, (_, i) => ({ id: `record-${i}` })) })
    await repositories.wellbeing.withdrawConsent()
    expect(sdk.read).toHaveBeenCalledWith(path)
    const operations = sdk.batches.flat()
    expect(operations.filter((operation) => (operation as string[])[0] === 'delete')).toHaveLength(count)
    expect(sdk.batches.every((batch) => batch.length <= 499)).toBe(true)
    expect(operations.at(-1)).toEqual(['update', profilePath, { wellbeingConsent: null, wellbeingWithdrawal: { id: lockId, pending: false }, updatedAt: instant }])
    expect(sdk.lock.mock.invocationCallOrder[0]).toBeLessThan(sdk.read.mock.invocationCallOrder[0])
    expect(sdk.batches.every((batch) => (batch.at(-1) as unknown[])[0] === 'update')).toBe(true)
  })
  it('does nothing after a failed server read and retains consent after interrupted deletion', async () => {
    const { repositories } = subscribed(); emitProfile(consented)
    sdk.read.mockRejectedValueOnce(new Error('offline'))
    await expect(repositories.wellbeing.withdrawConsent()).rejects.toThrow('offline')
    expect(sdk.commit).not.toHaveBeenCalled()
    sdk.read.mockResolvedValue({ docs: Array.from({ length: 500 }, (_, i) => ({ id: String(i) })) })
    sdk.commit.mockRejectedValueOnce(new Error('interrupted'))
    await expect(repositories.wellbeing.withdrawConsent()).rejects.toThrow('interrupted')
    expect(sdk.batches.flat()).not.toContainEqual(['update', profilePath, expect.objectContaining({ wellbeingConsent: null })])
    sdk.read.mockResolvedValue({ docs: [] })
    await repositories.wellbeing.withdrawConsent()
    expect(sdk.batches.at(-1)).toEqual([['update', profilePath, { wellbeingConsent: null, wellbeingWithdrawal: { id: lockId, pending: false }, updatedAt: instant }]])
  })
  it('permits today after reopening with cache-only snapshots and preserves cached createdAt', async () => {
    const repositories = createFirestoreHealthRepositories({} as Firestore, uid)
    const error = vi.fn()
    repositories.profile.subscribe(vi.fn(), error); repositories.wellbeing.subscribe(vi.fn(), error)
    emitProfile(consented, true); emitEntries([], false, true)
    const created = repositories.wellbeing.save(entry)
    emitEntries([entry], true, true)
    await expect(created).resolves.toBeUndefined()
    await expect(repositories.wellbeing.save({ ...entry, createdAt: '2026-11-12T09:00:00.000Z' })).rejects.toThrow('Creation')
    sdk.set.mockRejectedValueOnce(new Error('permission-denied: server createdAt differs'))
    await expect(repositories.wellbeing.save({ ...entry, sleep: 4 })).rejects.toThrow('server createdAt differs')
    expect(error).toHaveBeenCalledOnce()
    emitEntries([entry])
    expect(error).toHaveBeenCalledTimes(2)
  })
  it('waits for the shared lock acknowledgement before reading any documents', async () => {
    const { repositories } = subscribed(); emitProfile(consented)
    let unlock!: () => void
    sdk.lock.mockImplementationOnce(() => new Promise((resolve) => { unlock = resolve }))
    const withdrawal = repositories.wellbeing.withdrawConsent()
    await vi.waitFor(() => expect(sdk.lock).toHaveBeenCalledOnce())
    expect(sdk.read).not.toHaveBeenCalled()
    unlock(); await withdrawal
  })
  it('rejects local writes with a cached withdrawal marker from another session', async () => {
    const { repositories } = subscribed()
    emitProfile({ ...consented, wellbeingWithdrawal: { id: lockId, pending: true } }, true)
    repositories.wellbeing.subscribe(vi.fn(), vi.fn()); emitEntries([], false, true)
    await expect(repositories.wellbeing.save(entry)).rejects.toThrow('consent')
    expect(sdk.set).not.toHaveBeenCalled()
  })
  it('returns offline errors during a queued batch, releases the local guard, and reuses the shared generation on retry', async () => {
    const { repositories } = subscribed(); emitProfile(consented)
    let completeQueued!: () => void
    sdk.commit.mockImplementationOnce(() => new Promise((resolve) => { completeQueued = resolve }))
    const first = repositories.wellbeing.withdrawConsent(), rejected = expect(first).rejects.toThrow('Offline')
    await vi.waitFor(() => expect(sdk.commit).toHaveBeenCalledOnce())
    vi.stubGlobal('navigator', { onLine: false }); browserEvents.dispatchEvent(new Event('offline'))
    await rejected
    vi.stubGlobal('navigator', { onLine: true })
    await repositories.wellbeing.withdrawConsent()
    expect(sdk.transactionUpdates).toHaveLength(1)
    expect(sdk.batches.at(-1)).toEqual([['update', profilePath, { wellbeingConsent: null,
      wellbeingWithdrawal: { id: lockId, pending: false }, updatedAt: expect.any(String) }]])
    completeQueued()
    await Promise.resolve()
  })
  it('does not enqueue another batch when the connection drops between batches', async () => {
    const { repositories } = subscribed(); emitProfile(consented)
    sdk.read.mockResolvedValue({ docs: Array.from({ length: 500 }, (_, i) => ({ id: String(i) })) })
    sdk.commit.mockImplementationOnce(async () => { vi.stubGlobal('navigator', { onLine: false }) })
    await expect(repositories.wellbeing.withdrawConsent()).rejects.toThrow('Offline')
    expect(sdk.commit).toHaveBeenCalledOnce()
    expect(sdk.batches[0]).toHaveLength(499)
    expect(sdk.batches[0].at(-1)).toEqual(['update', profilePath, { wellbeingWithdrawal: { id: lockId, pending: true }, updatedAt: instant }])
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
    await vi.waitFor(() => expect(sdk.batches).toHaveLength(1))
    await expect(repositories.bodyWeights.save(weight)).rejects.toThrow('consent')
    await expect(repositories.profile.save(profile)).rejects.toThrow('progress')
    finish(); await withdrawal
    expect(sdk.batches).toHaveLength(2)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({
  initialize: vi.fn(() => ({})), connect: vi.fn(),
  terminate: vi.fn<() => Promise<void>>(), clear: vi.fn<() => Promise<void>>(),
  wait: vi.fn<() => Promise<void>>(),
  stop: vi.fn(),
}))
vi.mock('firebase/app', () => ({ getApp: () => 'app' }))
vi.mock('./firebaseConfig', () => ({ readFirebaseConfig: () => ({
  projectId: 'demo-combat-training', firestoreEmulatorHost: '127.0.0.1:8080',
}) }))
vi.mock('firebase/firestore', () => ({
  initializeFirestore: sdk.initialize, connectFirestoreEmulator: sdk.connect,
  persistentLocalCache: (options: unknown) => options, persistentMultipleTabManager: () => 'tabs',
  terminate: sdk.terminate, clearIndexedDbPersistence: sdk.clear,
  waitForPendingWrites: sdk.wait,
  collection: (_db: unknown, ...path: string[]) => path.join('/'),
  query: (path: string) => path, where: vi.fn(),
  onSnapshot: () => sdk.stop, setDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(), doc: vi.fn(),
}))

beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); sdk.terminate.mockResolvedValue(); sdk.clear.mockResolvedValue() })
afterEach(() => { vi.useRealTimers() })

describe('Firestore unsent writes', () => {
  beforeEach(() => { vi.useFakeTimers() })

  it('returns false without opening a database when none exists', async () => {
    const { hasUnsentWrites } = await import('./createFirestoreRepositories')
    await expect(hasUnsentWrites()).resolves.toBe(false)
    expect(sdk.initialize).not.toHaveBeenCalled()
    expect(sdk.wait).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('returns false as soon as the queue settles before one second', async () => {
    let finishWrites = () => {}
    sdk.wait.mockImplementationOnce(() => new Promise((resolve) => { finishWrites = resolve }))
    const { getAccountDatabase, hasUnsentWrites } = await import('./createFirestoreRepositories')
    const database = getAccountDatabase()
    const checking = hasUnsentWrites()
    await vi.advanceTimersByTimeAsync(250)
    finishWrites()
    await expect(checking).resolves.toBe(false)
    expect(sdk.wait).toHaveBeenCalledWith(database)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('warns at one second and handles a later SDK rejection', async () => {
    let rejectWrites = (_error: Error) => {}
    sdk.wait.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectWrites = reject }))
    const { getAccountDatabase, hasUnsentWrites } = await import('./createFirestoreRepositories')
    getAccountDatabase()
    const settled = vi.fn()
    const checking = hasUnsentWrites().then(settled)
    await vi.advanceTimersByTimeAsync(999)
    expect(settled).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await checking
    expect(settled).toHaveBeenCalledExactlyOnceWith(true)
    rejectWrites(new Error('Session changed after the timeout'))
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('warns immediately when the SDK rejects', async () => {
    sdk.wait.mockRejectedValueOnce(new Error('Session changed'))
    const { getAccountDatabase, hasUnsentWrites } = await import('./createFirestoreRepositories')
    getAccountDatabase()
    await expect(hasUnsentWrites()).resolves.toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('warns when the SDK throws synchronously', async () => {
    sdk.wait.mockImplementationOnce(() => { throw new Error('Database terminated') })
    const { getAccountDatabase, hasUnsentWrites } = await import('./createFirestoreRepositories')
    getAccountDatabase()
    await expect(hasUnsentWrites()).resolves.toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('Firestore sign-out lifecycle', () => {
  it('initializes, terminates and clears an unopened database, then resets the instance', async () => {
    let finishTermination = () => {}
    sdk.terminate.mockImplementationOnce(() => new Promise((resolve) => { finishTermination = resolve }))
    const { getAccountDatabase, clearFirestoreCache } = await import('./createFirestoreRepositories')
    const cleaning = clearFirestoreCache()
    const first = sdk.initialize.mock.results[0].value
    expect(sdk.initialize).toHaveBeenCalledExactlyOnceWith('app', { localCache: { tabManager: 'tabs' } })
    expect(sdk.connect).toHaveBeenCalledExactlyOnceWith(first, '127.0.0.1', 8080)
    expect(sdk.terminate).toHaveBeenCalledExactlyOnceWith(first)
    expect(sdk.clear).not.toHaveBeenCalled()
    finishTermination()
    await cleaning
    expect(sdk.clear).toHaveBeenCalledExactlyOnceWith(first)
    expect(sdk.terminate.mock.invocationCallOrder[0]).toBeLessThan(sdk.clear.mock.invocationCallOrder[0])
    expect(getAccountDatabase()).not.toBe(first)
    expect(sdk.initialize).toHaveBeenCalledTimes(2)
  })

  it('closes active subscriptions, awaits termination, clears persistence and starts a fresh instance', async () => {
    let finishTermination = () => {}
    sdk.terminate.mockImplementationOnce(() => new Promise((resolve) => { finishTermination = resolve }))
    const { createFirestoreRepositories, clearFirestoreCache } = await import('./createFirestoreRepositories')
    const first = createFirestoreRepositories('first-account')
    const stopPlans = first.plans.subscribe(vi.fn(), vi.fn())
    const stopSessions = first.sessions.subscribe(vi.fn(), vi.fn())
    const stopSkills = first.focusSkills.subscribe(vi.fn(), vi.fn())
    const stopWeeks = first.weekPlans.subscribe('2026-11-09', vi.fn(), vi.fn())
    const stopProfile = first.profile.subscribe(vi.fn(), vi.fn())
    const stopWeights = first.bodyWeights.subscribe(vi.fn(), vi.fn())
    const cleaning = clearFirestoreCache()
    expect(sdk.stop).toHaveBeenCalledTimes(6)
    expect(sdk.stop.mock.invocationCallOrder[5]).toBeLessThan(sdk.terminate.mock.invocationCallOrder[0])
    expect(sdk.clear).not.toHaveBeenCalled()
    finishTermination()
    await cleaning
    expect(sdk.clear).toHaveBeenCalledWith(sdk.initialize.mock.results[0].value)
    stopPlans()
    stopSessions()
    stopSkills()
    stopWeeks()
    stopProfile()
    stopWeights()
    expect(sdk.stop).toHaveBeenCalledTimes(6)
    createFirestoreRepositories('second-account')
    expect(sdk.initialize).toHaveBeenCalledTimes(2)
    expect(sdk.connect).toHaveBeenCalledTimes(2)
  })

  it('does not repeat already closed subscriptions and resets the instance after cleanup fails', async () => {
    const { createFirestoreRepositories, clearFirestoreCache } = await import('./createFirestoreRepositories')
    const first = createFirestoreRepositories('first-account')
    first.plans.subscribe(vi.fn(), vi.fn())()
    sdk.clear.mockRejectedValueOnce(new Error('Blocked IndexedDB deletion'))
    await expect(clearFirestoreCache()).rejects.toThrow('Blocked IndexedDB deletion')
    expect(sdk.stop).toHaveBeenCalledOnce()
    createFirestoreRepositories('second-account')
    expect(sdk.initialize).toHaveBeenCalledTimes(2)
    await clearFirestoreCache()
  })
})

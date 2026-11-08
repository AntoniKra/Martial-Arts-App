import { beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({
  initialize: vi.fn(() => ({})), connect: vi.fn(),
  terminate: vi.fn<() => Promise<void>>(), clear: vi.fn<() => Promise<void>>(),
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
  collection: (_db: unknown, ...path: string[]) => path.join('/'),
  onSnapshot: () => sdk.stop, setDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(), doc: vi.fn(),
}))

beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); sdk.terminate.mockResolvedValue(); sdk.clear.mockResolvedValue() })

describe('Firestore sign-out lifecycle', () => {
  it('does not initialize Firestore when signing out before data was loaded', async () => {
    const { clearFirestoreCache } = await import('./createFirestoreRepositories')
    await clearFirestoreCache()
    expect(sdk.initialize).not.toHaveBeenCalled()
    expect(sdk.terminate).not.toHaveBeenCalled()
    expect(sdk.clear).not.toHaveBeenCalled()
  })

  it('closes active subscriptions, awaits termination, clears persistence and starts a fresh instance', async () => {
    let finishTermination = () => {}
    sdk.terminate.mockImplementationOnce(() => new Promise((resolve) => { finishTermination = resolve }))
    const { createFirestoreRepositories, clearFirestoreCache } = await import('./createFirestoreRepositories')
    const first = createFirestoreRepositories('first-account')
    const stopPlans = first.plans.subscribe(vi.fn(), vi.fn())
    const stopSessions = first.sessions.subscribe(vi.fn(), vi.fn())
    const stopSkills = first.focusSkills.subscribe(vi.fn(), vi.fn())
    const cleaning = clearFirestoreCache()
    expect(sdk.stop).toHaveBeenCalledTimes(3)
    expect(sdk.stop.mock.invocationCallOrder[2]).toBeLessThan(sdk.terminate.mock.invocationCallOrder[0])
    expect(sdk.clear).not.toHaveBeenCalled()
    finishTermination()
    await cleaning
    expect(sdk.clear).toHaveBeenCalledWith(sdk.initialize.mock.results[0].value)
    stopPlans()
    stopSessions()
    stopSkills()
    expect(sdk.stop).toHaveBeenCalledTimes(3)
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

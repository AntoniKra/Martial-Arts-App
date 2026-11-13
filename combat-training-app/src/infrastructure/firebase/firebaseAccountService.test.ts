import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authSdk from 'firebase/auth'
import * as firestoreSdk from 'firebase/firestore'
import { createFirebaseAccountService } from './firebaseAccountService'

const fake = vi.hoisted(() => ({
  user: { uid: 'athlete', email: 'athlete@example.test', providerData: [{ providerId: 'password' }, { providerId: 'google.com' }] },
  environment: { standalone: false, touchPrimary: false },
  cache: vi.fn(), marker: vi.fn(), clearMarker: vi.fn(), local: vi.fn(), commits: [] as ReturnType<typeof vi.fn>[],
}))
vi.mock('firebase/auth', () => ({
  getAuth: () => ({ currentUser: fake.user }), EmailAuthProvider: { credential: vi.fn(() => 'credential') },
  GoogleAuthProvider: class { setCustomParameters = vi.fn() },
  reauthenticateWithCredential: vi.fn(), reauthenticateWithPopup: vi.fn(), reauthenticateWithRedirect: vi.fn(),
  getIdTokenResult: vi.fn(), deleteUser: vi.fn(),
}))
vi.mock('./firebaseAuthService', () => ({ readSignInEnvironment: () => fake.environment }))
vi.mock('./createFirestoreRepositories', () => ({ getAccountDatabase: () => 'db', clearFirestoreCache: fake.cache }))
vi.mock('@/infrastructure/storage/accountDeletionStorage', () => ({
  clearAccountLocalStorage: fake.local, clearDeletionRedirect: fake.clearMarker, markDeletionRedirect: fake.marker,
}))
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...path: string[]) => path.join('/'), doc: (_db: unknown, ...path: string[]) => path.join('/'),
  getDocFromServer: vi.fn(), getDocsFromServer: vi.fn(), deleteDoc: vi.fn(),
  writeBatch: vi.fn(() => { const commit = vi.fn(); fake.commits.push(commit); return { delete: vi.fn(), commit } }),
}))
const browserEvents = new EventTarget()
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('addEventListener', browserEvents.addEventListener.bind(browserEvents))
  vi.stubGlobal('removeEventListener', browserEvents.removeEventListener.bind(browserEvents))
  fake.commits = []
  fake.environment = { standalone: false, touchPrimary: false }
})
describe('Firebase account operations', () => {
  it('reads raw invalid documents from the server and only implemented collections', async () => {
    vi.mocked(firestoreSdk.getDocFromServer).mockResolvedValue({ exists: () => false, metadata: { hasPendingWrites: false } } as never)
    vi.mocked(firestoreSdk.getDocsFromServer).mockResolvedValue({ metadata: { hasPendingWrites: false },
      docs: [{ id: 'invalid', data: () => ({ schemaVersion: 99, raw: true }) }] } as never)
    vi.stubGlobal('navigator', { onLine: true })
    try {
      const result = await createFirebaseAccountService('athlete').readData()
      expect(result.profile).toBeNull()
      expect(Object.keys(result.collections)).toEqual(['workoutPlans', 'workoutSessions', 'focusSkills', 'weekPlans', 'bodyWeights'])
      expect(result.collections.workoutSessions).toEqual([{ id: 'invalid', data: { schemaVersion: 99, raw: true } }])
      expect(firestoreSdk.getDocsFromServer).toHaveBeenCalledTimes(5)
    } finally { vi.unstubAllGlobals() }
  })
  it('rejects a server snapshot that still includes pending local data', async () => {
    vi.mocked(firestoreSdk.getDocFromServer).mockResolvedValue({ exists: () => false, metadata: { hasPendingWrites: true } } as never)
    vi.mocked(firestoreSdk.getDocsFromServer).mockResolvedValue({ metadata: { hasPendingWrites: false }, docs: [] } as never)
    vi.stubGlobal('navigator', { onLine: true })
    try { await expect(createFirebaseAccountService('athlete').readData()).rejects.toThrow('Pending writes') }
    finally { vi.unstubAllGlobals() }
  })
  it.each([[false, false, 'popup'], [false, true, 'redirect'], [true, false, 'redirect']] as const)(
    'reauthenticates Google for standalone=%s touch=%s using %s', async (standalone, touchPrimary, method) => {
      fake.environment = { standalone, touchPrimary }
      expect(await createFirebaseAccountService('athlete').reauthenticateGoogle()).toBe(method)
      expect(method === 'popup' ? authSdk.reauthenticateWithPopup : authSdk.reauthenticateWithRedirect).toHaveBeenCalledWith(fake.user, expect.anything())
      if (method === 'redirect') expect(fake.marker).toHaveBeenCalledWith('athlete')
    })
  it('reauthenticates with a password and measures the confirmation age from one fresh token', async () => {
    vi.mocked(authSdk.getIdTokenResult).mockResolvedValue({ authTime: '2026-11-13T09:00:00.000Z', issuedAtTime: '2026-11-13T09:00:03.000Z' } as never)
    const service = createFirebaseAccountService('athlete')
    await service.reauthenticatePassword('test-only')
    expect(authSdk.EmailAuthProvider.credential).toHaveBeenCalledWith(fake.user.email, 'test-only')
    expect(authSdk.reauthenticateWithCredential).toHaveBeenCalledWith(fake.user, 'credential')
    vi.stubGlobal('navigator', { onLine: true })
    try { expect(await service.confirmationAgeMs()).toBe(3_000) }
    finally { vi.unstubAllGlobals() }
    expect(authSdk.getIdTokenResult).toHaveBeenCalledWith(fake.user, true)
  })
  it.each([0, 1, 500, 501])('commits deletions of %s raw documents in batches of at most 500', async (count) => {
    vi.mocked(firestoreSdk.getDocsFromServer).mockResolvedValue({ metadata: { hasPendingWrites: false },
      docs: Array.from({ length: count }, (_, index) => ({ ref: String(index) })) } as never)
    vi.stubGlobal('navigator', { onLine: true })
    try { await createFirebaseAccountService('athlete').deleteCollection('bodyWeights') }
    finally { vi.unstubAllGlobals() }
    expect(firestoreSdk.writeBatch).toHaveBeenCalledTimes(Math.ceil(count / 500))
    expect(vi.mocked(firestoreSdk.writeBatch).mock.results.map((result) => result.value.delete.mock.calls.length))
      .toEqual(count === 0 ? [] : count <= 500 ? [count] : [500, 1])
    expect(fake.commits.every((commit) => commit.mock.calls.length === 1)).toBe(true)
  })
  it('fails a deletion batch that Firestore would queue after the connection drops', async () => {
    vi.mocked(firestoreSdk.getDocsFromServer).mockResolvedValue({ metadata: { hasPendingWrites: false }, docs: [{ ref: '0' }] } as never)
    vi.mocked(firestoreSdk.writeBatch).mockImplementationOnce(() => {
      const commit = vi.fn(() => new Promise<void>(() => undefined)); fake.commits.push(commit); return { delete: vi.fn(), commit } as never
    })
    vi.stubGlobal('navigator', { onLine: true })
    try {
      const deletion = createFirebaseAccountService('athlete').deleteCollection('bodyWeights')
      await vi.waitFor(() => expect(fake.commits).toHaveLength(1))
      browserEvents.dispatchEvent(new Event('offline'))
      await expect(deletion).rejects.toThrow('Offline account operation')
    } finally { vi.unstubAllGlobals() }
  })
  it('clears account storage even if another tab blocks cache cleanup', async () => {
    fake.cache.mockRejectedValueOnce(new Error('Another tab'))
    await expect(createFirebaseAccountService('athlete').cleanupDevice()).rejects.toThrow('Another tab')
    expect(fake.local).toHaveBeenCalledWith('athlete')
    expect(fake.clearMarker).toHaveBeenCalledOnce()
  })
})

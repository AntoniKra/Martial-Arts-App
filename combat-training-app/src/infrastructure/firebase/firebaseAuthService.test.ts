import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as sdk from 'firebase/auth'
import { initializeApp } from 'firebase/app'
import { createFirebaseAuthService, readSignInEnvironment } from './firebaseAuthService'

const fake = vi.hoisted(() => ({
  user: { uid: 'athlete', email: 'athlete@example.test', emailVerified: false },
  auth: { currentUser: null as unknown, languageCode: '' },
  clearCache: vi.fn<() => Promise<void>>(),
}))
vi.mock('./createFirestoreRepositories', () => ({ clearFirestoreCache: fake.clearCache }))
vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => 'app') }))
vi.mock('firebase/auth', () => ({
  initializeAuth: vi.fn(() => fake.auth), indexedDBLocalPersistence: 'indexed-db',
  browserPopupRedirectResolver: 'popup-redirect-resolver',
  connectAuthEmulator: vi.fn(), createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(), signOut: vi.fn(), sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(), reload: vi.fn(), onIdTokenChanged: vi.fn(),
  signInWithPopup: vi.fn(), signInWithRedirect: vi.fn(), getRedirectResult: vi.fn(),
  GoogleAuthProvider: vi.fn(function GoogleAuthProvider(this: { setCustomParameters: unknown }) {
    this.setCustomParameters = vi.fn()
  }),
}))
const desktop = () => ({ standalone: false, touchPrimary: false })
const phone = () => ({ standalone: false, touchPrimary: true })
const installedPwa = () => ({ standalone: true, touchPrimary: false })
const config = { apiKey: 'demo-config', authDomain: 'demo.example.test', projectId: 'demo-combat-training', appId: 'demo-app', emulatorHost: '127.0.0.1:9099' }

beforeEach(() => {
  vi.resetAllMocks()
  fake.auth.currentUser = fake.user
  fake.user.emailVerified = false
  vi.mocked(sdk.initializeAuth).mockReturnValue(fake.auth as unknown as sdk.Auth)
})

describe('Firebase AuthService', () => {
  it('clears only the signing-out account active workout', async () => {
    const values = new Map([
      ['combat-training.activeWorkout.athlete', '{}'], ['combat-training.activeWorkout.other', '{}'],
    ])
    vi.stubGlobal('localStorage', { removeItem: (key: string) => { values.delete(key) } })
    try {
      await createFirebaseAuthService(config).signOut()
      expect(values.has('combat-training.activeWorkout.athlete')).toBe(false)
      expect(values.has('combat-training.activeWorkout.other')).toBe(true)
    } finally { vi.unstubAllGlobals() }
  })
  it('uses only IndexedDB persistence and explicitly connects the emulator', () => {
    createFirebaseAuthService(config)
    expect(initializeApp).toHaveBeenCalledWith({ apiKey: 'demo-config', authDomain: 'demo.example.test', projectId: 'demo-combat-training', appId: 'demo-app' })
    expect(sdk.initializeAuth).toHaveBeenCalledWith('app', { persistence: 'indexed-db', popupRedirectResolver: 'popup-redirect-resolver' })
    expect(sdk.connectAuthEmulator).toHaveBeenCalledWith(fake.auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    expect(fake.auth.languageCode).toBe('pl')
  })
  it('delegates registration, login and logout', async () => {
    const service = createFirebaseAuthService(config)
    await service.register('athlete@example.test', 'test-only-pass')
    await service.signIn('athlete@example.test', 'test-only-pass')
    await service.signOut()
    expect(sdk.createUserWithEmailAndPassword).toHaveBeenCalledWith(fake.auth, 'athlete@example.test', 'test-only-pass')
    expect(sdk.signInWithEmailAndPassword).toHaveBeenCalledWith(fake.auth, 'athlete@example.test', 'test-only-pass')
    expect(sdk.signOut).toHaveBeenCalledWith(fake.auth)
  })
  it('uses a Google popup on a desktop', async () => {
    await createFirebaseAuthService(config, desktop).signInWithGoogle()
    const provider = vi.mocked(sdk.signInWithPopup).mock.calls[0][1] as sdk.GoogleAuthProvider
    expect(sdk.signInWithPopup).toHaveBeenCalledWith(fake.auth, provider)
    expect(provider.setCustomParameters).toHaveBeenCalledWith({ prompt: 'select_account' })
    expect(sdk.signInWithRedirect).not.toHaveBeenCalled()
  })
  it.each([['a phone', phone], ['an installed PWA', installedPwa]])('uses a Google redirect on %s', async (_name, environment) => {
    await createFirebaseAuthService(config, environment).signInWithGoogle()
    expect(sdk.signInWithRedirect).toHaveBeenCalledWith(fake.auth, expect.anything())
    expect(sdk.signInWithPopup).not.toHaveBeenCalled()
  })
  it('passes Google errors through for display', async () => {
    vi.mocked(sdk.signInWithPopup).mockRejectedValue({ code: 'auth/popup-blocked' })
    await expect(createFirebaseAuthService(config, desktop).signInWithGoogle()).rejects.toEqual({ code: 'auth/popup-blocked' })
  })
  it('settles the Google redirect result and rejects with its error', async () => {
    const service = createFirebaseAuthService(config, phone)
    vi.mocked(sdk.getRedirectResult).mockResolvedValueOnce(null)
    await expect(service.completeGoogleRedirect()).resolves.toBeUndefined()
    vi.mocked(sdk.getRedirectResult).mockRejectedValueOnce({ code: 'auth/account-exists-with-different-credential' })
    await expect(service.completeGoogleRedirect()).rejects.toEqual({ code: 'auth/account-exists-with-different-credential' })
    expect(sdk.getRedirectResult).toHaveBeenCalledWith(fake.auth)
  })
  it.each([
    [{ standalone: false, coarse: false, iosStandalone: false }, { standalone: false, touchPrimary: false }],
    [{ standalone: false, coarse: true, iosStandalone: false }, { standalone: false, touchPrimary: true }],
    [{ standalone: true, coarse: false, iosStandalone: false }, { standalone: true, touchPrimary: false }],
    [{ standalone: false, coarse: true, iosStandalone: true }, { standalone: true, touchPrimary: true }],
  ])('reads the sign-in environment from the browser %j', (browser, environment) => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(display-mode: standalone)' ? browser.standalone : query === '(pointer: coarse)' && browser.coarse,
    }))
    vi.stubGlobal('navigator', browser.iosStandalone ? { standalone: true } : {})
    try {
      expect(readSignInEnvironment()).toEqual(environment)
    } finally { vi.unstubAllGlobals() }
  })
  it('sends verification, refreshes the ID token before reloading and returns the verified session', async () => {
    const user = { ...fake.user, getIdToken: vi.fn(async () => 'fresh-token') }
    fake.auth.currentUser = user
    const service = createFirebaseAuthService(config)
    await service.sendVerificationEmail()
    vi.mocked(sdk.reload).mockImplementation(async () => { user.emailVerified = true })
    expect(await service.refreshVerification()).toEqual({ uid: user.uid, email: user.email, emailVerified: true })
    expect(sdk.sendEmailVerification).toHaveBeenCalledWith(user)
    expect(user.getIdToken).toHaveBeenCalledWith(true)
    expect(user.getIdToken.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(sdk.reload).mock.invocationCallOrder[0])
  })
  it('does not reload when the token refresh fails', async () => {
    const user = { ...fake.user, getIdToken: vi.fn(async () => { throw { code: 'auth/network-request-failed' } }) }
    fake.auth.currentUser = user
    await expect(createFirebaseAuthService(config).refreshVerification()).rejects.toEqual({ code: 'auth/network-request-failed' })
    expect(sdk.reload).not.toHaveBeenCalled()
  })
  it('waits for cache cleanup before signing out', async () => {
    let finishCleanup = () => {}
    fake.clearCache.mockImplementation(() => new Promise((resolve) => { finishCleanup = resolve }))
    const service = createFirebaseAuthService(config)
    const signingOut = service.signOut()
    await vi.waitFor(() => expect(fake.clearCache).toHaveBeenCalledOnce())
    expect(sdk.signOut).not.toHaveBeenCalled()
    finishCleanup()
    await signingOut
    expect(sdk.signOut).toHaveBeenCalledOnce()
  })
  it('logs a cleanup failure and still signs out', async () => {
    const error = new Error('Cache is held by another tab')
    fake.clearCache.mockRejectedValue(error)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await expect(createFirebaseAuthService(config).signOut()).resolves.toBeUndefined()
      expect(log).toHaveBeenCalledWith('Failed to clear Firestore cache during sign-out', error)
      expect(sdk.signOut).toHaveBeenCalledOnce()
    } finally { log.mockRestore() }
  })
  it('handles a missing session', async () => {
    const service = createFirebaseAuthService(config)
    fake.auth.currentUser = null
    await expect(service.sendVerificationEmail()).rejects.toThrow()
    expect(await service.refreshVerification()).toBeNull()
  })
  it('hides missing accounts when requesting a password reset', async () => {
    const service = createFirebaseAuthService(config)
    vi.mocked(sdk.sendPasswordResetEmail).mockRejectedValue({ code: 'auth/user-not-found' })
    await expect(service.requestPasswordReset('missing@example.test')).resolves.toBeUndefined()
    expect(sdk.sendPasswordResetEmail).toHaveBeenCalledWith(fake.auth, 'missing@example.test')
  })
  it('preserves network and rate limit errors for display', async () => {
    const service = createFirebaseAuthService(config)
    vi.mocked(sdk.sendPasswordResetEmail).mockRejectedValue({ code: 'auth/network-request-failed' })
    await expect(service.requestPasswordReset('athlete@example.test')).rejects.toEqual({ code: 'auth/network-request-failed' })
  })
  it('subscribes, projects only session fields, validates external users and unsubscribes', () => {
    const service = createFirebaseAuthService(config)
    const unsubscribe = vi.fn()
    vi.mocked(sdk.onIdTokenChanged).mockReturnValue(unsubscribe)
    const onSession = vi.fn()
    const onError = vi.fn()
    expect(service.subscribe(onSession, onError)).toBe(unsubscribe)
    const callback = vi.mocked(sdk.onIdTokenChanged).mock.calls[0][1] as (user: sdk.User | null) => void
    callback(fake.user as sdk.User)
    expect(onSession).toHaveBeenCalledWith(fake.user)
    callback(null)
    expect(onSession).toHaveBeenLastCalledWith(null)
    callback({ uid: 'invalid' } as sdk.User)
    expect(onError).toHaveBeenCalledOnce()
  })
})

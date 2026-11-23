import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as sdk from 'firebase/auth'
import { initializeApp } from 'firebase/app'
import { createMemoryStorage } from '@/test/memoryStorage'
import { createFirebaseAuthService, readSignInEnvironment } from './firebaseAuthService'

const fake = vi.hoisted(() => ({
  user: {
    uid: 'athlete', email: 'athlete@example.test', emailVerified: false,
    getIdToken: vi.fn<(forceRefresh: boolean) => Promise<string>>(),
    getIdTokenResult: vi.fn<() => Promise<{ claims: { email_verified?: unknown } }>>(),
  },
  auth: { currentUser: null as unknown, languageCode: '' },
  clearCache: vi.fn<() => Promise<void>>(),
  hasUnsentWrites: vi.fn<() => Promise<boolean>>(),
}))
vi.mock('./createFirestoreRepositories', () => ({ clearFirestoreCache: fake.clearCache, hasUnsentWrites: fake.hasUnsentWrites }))
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
  vi.stubGlobal('location', { origin: 'http://127.0.0.1:4173' })
  fake.auth.currentUser = fake.user
  fake.user.emailVerified = false
  fake.user.getIdToken.mockResolvedValue('refreshed')
  fake.user.getIdTokenResult.mockResolvedValue({ claims: { email_verified: false } })
  vi.mocked(sdk.initializeAuth).mockReturnValue(fake.auth as unknown as sdk.Auth)
})
afterEach(() => vi.unstubAllGlobals())

function observeSession(service = createFirebaseAuthService(config)) {
  const unsubscribeSdk = vi.fn()
  vi.mocked(sdk.onIdTokenChanged).mockReturnValue(unsubscribeSdk)
  const onState = vi.fn<Parameters<typeof service.subscribe>[0]>()
  const unsubscribe = service.subscribe(onState)
  const onTokenChanged = vi.mocked(sdk.onIdTokenChanged).mock.lastCall![1] as (user: unknown) => Promise<void>
  return { onState, onTokenChanged, unsubscribe, unsubscribeSdk }
}

const verifiedSession = { uid: 'athlete', email: 'athlete@example.test', emailVerified: true }
const networkError = { code: 'auth/network-request-failed' }

describe('Firebase AuthService', () => {
  it.each(['athlete-app.example.test', 'another-app.example.test'])('uses the configured app domain %s for both email actions', async (authDomain) => {
    const service = createFirebaseAuthService({ ...config, authDomain, emulatorHost: undefined })
    await service.sendVerificationEmail()
    await service.requestPasswordReset('athlete@example.test')
    const settings = { url: `https://${authDomain}/` }
    expect(sdk.sendEmailVerification).toHaveBeenCalledWith(fake.user, settings)
    expect(sdk.sendPasswordResetEmail).toHaveBeenCalledWith(fake.auth, 'athlete@example.test', settings)
  })
  it.each([false, true])('delegates the unsent write check returning %s', async (pending) => {
    fake.hasUnsentWrites.mockResolvedValueOnce(pending)
    await expect(createFirebaseAuthService(config).hasUnsentWrites()).resolves.toBe(pending)
    expect(fake.hasUnsentWrites).toHaveBeenCalledOnce()
    expect(sdk.signOut).not.toHaveBeenCalled()
  })
  it('requires a warning when loading or checking the write queue fails', async () => {
    fake.hasUnsentWrites.mockRejectedValueOnce(new Error('Queue unavailable'))
    await expect(createFirebaseAuthService(config).hasUnsentWrites()).resolves.toBe(true)
    expect(sdk.signOut).not.toHaveBeenCalled()
  })
  it('clears only the signing-out account workouts, including unreadable completed copies', async () => {
    const storage = createMemoryStorage()
    vi.stubGlobal('localStorage', storage)
    const ownKeys = ['combat-training.activeWorkout.athlete', 'combat-training.completedWorkout.one.athlete',
      'combat-training.completedWorkout.two%2Ewith%2Edots.athlete']
    const unrelatedKeys = ['combat-training.activeWorkout.other', 'combat-training.completedWorkout.one.other.athlete',
      'combat-training.completedWorkout.one.athlete.other', 'combat-training.quickTimer.athlete']
    for (const key of [...ownKeys, ...unrelatedKeys]) storage.setItem(key, 'unreadable')
    await createFirebaseAuthService(config).signOut()
    for (const key of ownKeys) expect(storage.getItem(key)).toBeNull()
    for (const key of unrelatedKeys) expect(storage.getItem(key)).toBe('unreadable')
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
    await expect(service.completeGoogleRedirect()).resolves.toBeNull()
    vi.mocked(sdk.getRedirectResult).mockRejectedValueOnce({ code: 'auth/account-exists-with-different-credential' })
    await expect(createFirebaseAuthService(config, phone).completeGoogleRedirect()).rejects.toEqual({ code: 'auth/account-exists-with-different-credential' })
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
  it('reloads the account on explicit checks and shares a single refresh with the token listener', async () => {
    const service = createFirebaseAuthService(config)
    const { onState, onTokenChanged } = observeSession(service)
    await service.sendVerificationEmail()
    vi.mocked(sdk.reload).mockImplementation(async () => {
      fake.user.emailVerified = true
      void onTokenChanged(fake.user)
    })
    fake.user.getIdToken.mockImplementation(async () => {
      fake.user.getIdTokenResult.mockResolvedValue({ claims: { email_verified: true } })
      return 'refreshed'
    })
    const checks = await Promise.all([service.refreshVerification(), service.refreshVerification()])
    expect(checks).toEqual([verifiedSession, verifiedSession])
    expect(onState).toHaveBeenLastCalledWith({ status: 'ready', session: verifiedSession })
    expect(sdk.sendEmailVerification).toHaveBeenCalledWith(fake.user, { url: 'http://127.0.0.1:4173/' })
    expect(sdk.reload).toHaveBeenCalledOnce()
    expect(fake.user.getIdToken).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('keeps a verified profile in the checking state until the token claim is true', async () => {
    const { onState, onTokenChanged } = observeSession()
    fake.user.emailVerified = true
    let finishRefresh!: (value: string) => void
    fake.user.getIdToken.mockReturnValue(new Promise((resolve) => { finishRefresh = resolve }))
    const firstCheck = onTokenChanged(fake.user)
    await vi.waitFor(() => expect(onState).toHaveBeenCalledExactlyOnceWith({ status: 'loading' }))
    const repeatedCheck = onTokenChanged(fake.user)
    fake.user.getIdTokenResult.mockResolvedValue({ claims: { email_verified: true } })
    finishRefresh('refreshed')
    await Promise.all([firstCheck, repeatedCheck])
    expect(onState).toHaveBeenLastCalledWith({ status: 'ready', session: verifiedSession })
    expect(fake.user.getIdToken).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('does not repeat a forced refresh when the new token still lacks a true claim', async () => {
    const { onState, onTokenChanged } = observeSession()
    fake.user.emailVerified = true
    fake.user.getIdTokenResult.mockResolvedValue({ claims: { email_verified: 'true' } })
    fake.user.getIdToken.mockImplementation(async () => {
      void onTokenChanged(fake.user)
      return 'refreshed'
    })
    await onTokenChanged(fake.user)
    await onTokenChanged(fake.user)
    expect(onState).toHaveBeenLastCalledWith({ status: 'error' })
    expect(onState.mock.calls.every(([state]) => state.status !== 'ready')).toBe(true)
    expect(fake.user.getIdToken).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('publishes the session error without retrying after a failed forced refresh', async () => {
    const { onState, onTokenChanged } = observeSession()
    fake.user.emailVerified = true
    fake.user.getIdToken.mockRejectedValue(new Error('Token refresh failed'))
    await onTokenChanged(fake.user)
    expect(onState.mock.calls).toEqual([[{ status: 'loading' }], [{ status: 'error' }]])
    await onTokenChanged(fake.user)
    expect(onState).toHaveBeenLastCalledWith({ status: 'error' })
    expect(fake.user.getIdToken).toHaveBeenCalledExactlyOnceWith(true)
  })

  it.each([false, true])('opens the cached session offline with emailVerified=%s without waiting for Auth', async (emailVerified) => {
    vi.stubGlobal('navigator', { onLine: false })
    fake.user.emailVerified = emailVerified
    const service = createFirebaseAuthService(config)
    const { onState, onTokenChanged } = observeSession(service)
    const session = { ...verifiedSession, emailVerified }
    await onTokenChanged(fake.user)
    await expect(service.refreshVerification()).resolves.toEqual(session)
    expect(onState).toHaveBeenCalledExactlyOnceWith({ status: 'ready', session })
    expect(fake.user.getIdTokenResult).not.toHaveBeenCalled()
    expect(fake.user.getIdToken).not.toHaveBeenCalled()
    expect(sdk.reload).not.toHaveBeenCalled()
  })

  it('uses the cached session if a non-forced token read fails with a network error', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    const { onState, onTokenChanged } = observeSession()
    fake.user.emailVerified = true
    fake.user.getIdTokenResult.mockRejectedValue(networkError)
    await onTokenChanged(fake.user)
    expect(fake.user.getIdTokenResult).toHaveBeenCalledExactlyOnceWith()
    expect(fake.user.getIdToken).not.toHaveBeenCalled()
    expect(onState).toHaveBeenCalledExactlyOnceWith({ status: 'ready', session: verifiedSession })
  })

  it('uses the cached session if the forced token refresh fails with a network error', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    const { onState, onTokenChanged } = observeSession()
    fake.user.emailVerified = true
    fake.user.getIdToken.mockRejectedValue(networkError)
    await onTokenChanged(fake.user)
    expect(fake.user.getIdToken).toHaveBeenCalledExactlyOnceWith(true)
    expect(onState.mock.calls).toEqual([[{ status: 'loading' }], [{ status: 'ready', session: verifiedSession }]])
  })

  it('does not start a forced token refresh if connectivity drops during the token read', async () => {
    const browser = { onLine: true }
    vi.stubGlobal('navigator', browser)
    const { onState, onTokenChanged } = observeSession()
    fake.user.emailVerified = true
    fake.user.getIdTokenResult.mockImplementation(async () => {
      browser.onLine = false
      return { claims: { email_verified: false } }
    })
    await onTokenChanged(fake.user)
    expect(fake.user.getIdToken).not.toHaveBeenCalled()
    expect(onState).toHaveBeenCalledExactlyOnceWith({ status: 'ready', session: verifiedSession })
  })

  it('keeps the unverified session when reloading the profile fails with a network error', async () => {
    const service = createFirebaseAuthService(config)
    const { onState, onTokenChanged } = observeSession(service)
    const session = { ...verifiedSession, emailVerified: false }
    await onTokenChanged(fake.user)
    vi.mocked(sdk.reload).mockRejectedValue(networkError)
    await expect(service.refreshVerification()).resolves.toEqual(session)
    expect(sdk.reload).toHaveBeenCalledOnce()
    expect(onState).toHaveBeenCalledExactlyOnceWith({ status: 'ready', session })
  })

  it('ignores a stale claim read after a newer token event verifies the session', async () => {
    const { onState, onTokenChanged } = observeSession()
    fake.user.emailVerified = true
    let finishReadingClaim!: () => void
    fake.user.getIdTokenResult.mockReturnValueOnce(new Promise((resolve) => {
      finishReadingClaim = () => resolve({ claims: { email_verified: false } })
    }))
    const staleCheck = onTokenChanged(fake.user)
    fake.user.getIdTokenResult.mockResolvedValue({ claims: { email_verified: true } })
    await onTokenChanged(fake.user)
    finishReadingClaim()
    await staleCheck
    expect(onState).toHaveBeenCalledExactlyOnceWith({ status: 'ready', session: verifiedSession })
    expect(fake.user.getIdToken).not.toHaveBeenCalled()
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
  it('signs out with a notice after cleanup fails and retries once per start until it succeeds', async () => {
    vi.stubGlobal('localStorage', createMemoryStorage())
    fake.clearCache.mockRejectedValueOnce(new Error('Cache is held by another tab'))
      .mockRejectedValueOnce(new Error('Still blocked')).mockResolvedValue(undefined)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const service = createFirebaseAuthService(config)
      const first = observeSession(service)
      await expect(service.signOut()).resolves.toBeUndefined()
      expect(sdk.signOut).toHaveBeenCalledOnce()
      fake.auth.currentUser = null
      await first.onTokenChanged(null)
      expect(first.onState).toHaveBeenLastCalledWith({ status: 'ready', session: null, cacheCleanupPending: true })

      const restarted = observeSession()
      await restarted.onTokenChanged(null)
      expect(restarted.onState).toHaveBeenLastCalledWith({ status: 'ready', session: null, cacheCleanupPending: true })
      expect(fake.clearCache).toHaveBeenCalledTimes(2)

      const unblocked = observeSession()
      await unblocked.onTokenChanged(null)
      expect(unblocked.onState).toHaveBeenLastCalledWith({ status: 'ready', session: null })
      expect(fake.clearCache).toHaveBeenCalledTimes(3)
      createFirebaseAuthService(config)
      expect(fake.clearCache).toHaveBeenCalledTimes(3)
      expect(log).toHaveBeenCalledTimes(2)
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
    expect(sdk.sendPasswordResetEmail).toHaveBeenCalledWith(fake.auth, 'missing@example.test', { url: 'http://127.0.0.1:4173/' })
  })
  it('preserves network and rate limit errors for display', async () => {
    const service = createFirebaseAuthService(config)
    vi.mocked(sdk.sendPasswordResetEmail).mockRejectedValue({ code: 'auth/network-request-failed' })
    await expect(service.requestPasswordReset('athlete@example.test')).rejects.toEqual({ code: 'auth/network-request-failed' })
  })
  it('projects session fields, validates external users and unsubscribes', async () => {
    const { onState, onTokenChanged, unsubscribe, unsubscribeSdk } = observeSession()
    await onTokenChanged(fake.user)
    expect(onState).toHaveBeenLastCalledWith({ status: 'ready', session: { ...verifiedSession, emailVerified: false } })
    expect(fake.user.getIdToken).not.toHaveBeenCalled()
    fake.auth.currentUser = null
    await onTokenChanged(null)
    expect(onState).toHaveBeenLastCalledWith({ status: 'ready', session: null })
    const invalidUser = { uid: 'invalid' }
    fake.auth.currentUser = invalidUser
    await onTokenChanged(invalidUser)
    expect(onState).toHaveBeenLastCalledWith({ status: 'error' })
    unsubscribe()
    expect(unsubscribeSdk).toHaveBeenCalledOnce()
  })
})

it('exposes the redirect operation once even when multiple consumers settle it', async () => {
  vi.mocked(sdk.getRedirectResult).mockResolvedValue({ operationType: 'reauthenticate' } as sdk.UserCredential)
  const service = createFirebaseAuthService(config)
  expect(await service.completeGoogleRedirect()).toBe('reauthenticate')
  expect(await service.completeGoogleRedirect()).toBe('reauthenticate')
  expect(sdk.getRedirectResult).toHaveBeenCalledOnce()
})

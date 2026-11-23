import { initializeApp } from 'firebase/app'
import {
  browserPopupRedirectResolver, connectAuthEmulator, createUserWithEmailAndPassword, getRedirectResult,
  GoogleAuthProvider, indexedDBLocalPersistence, initializeAuth, onIdTokenChanged, reload,
  sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup,
  signInWithRedirect, signOut,
  type User,
} from 'firebase/auth'

import type { AuthService, AuthSession } from '@/application/auth/authService'
import { chooseGoogleSignInMethod, type SignInEnvironment } from '@/application/auth/chooseGoogleSignInMethod'
import type { FirebaseConfig } from './firebaseConfig'
import { createActiveWorkoutRepository } from '@/infrastructure/storage/activeWorkoutStorage'
import { createCompletedWorkoutStorage } from '@/infrastructure/storage/completedWorkoutStorage'

const cacheCleanupKey = 'combat-training.firestoreCacheCleanupPending'
const cacheCleanupTimeoutMs = 3000

function readCacheCleanupPending(): boolean {
  try { return localStorage.getItem(cacheCleanupKey) === 'pending' } catch { return false }
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function isNetworkFailure(error: unknown): boolean {
  return isOffline() || (typeof error === 'object' && error !== null && 'code' in error
    && error.code === 'auth/network-request-failed')
}

function readCachedSession(user: User): AuthSession {
  if (typeof user.uid !== 'string' || !user.uid || typeof user.email !== 'string' || !user.email
    || typeof user.emailVerified !== 'boolean') throw new Error('Invalid authentication session')
  return { uid: user.uid, email: user.email, emailVerified: user.emailVerified }
}

async function hasVerifiedEmailClaim(user: User): Promise<boolean> {
  return (await user.getIdTokenResult()).claims.email_verified === true
}

async function refreshVerifiedEmailClaim(user: User): Promise<void> {
  await user.getIdToken(true)
  if (!await hasVerifiedEmailClaim(user)) throw new Error('The refreshed token does not verify the email address')
}

export function readSignInEnvironment(): SignInEnvironment {
  const matches = (query: string) => typeof matchMedia === 'function' && matchMedia(query).matches
  const iosStandalone = typeof navigator !== 'undefined' && 'standalone' in navigator && navigator.standalone === true
  return { standalone: matches('(display-mode: standalone)') || iosStandalone, touchPrimary: matches('(pointer: coarse)') }
}

export function createFirebaseAuthService(
  config: FirebaseConfig,
  readEnvironment: () => SignInEnvironment = readSignInEnvironment,
): AuthService {
  const { emulatorHost, firestoreEmulatorHost: _firestoreHost, ...options } = config
  // The resolver lets initialization finish a pending redirect before the first session callback,
  // so a returning user sees the session check instead of a flash of the login form.
  const auth = initializeAuth(initializeApp(options), {
    persistence: indexedDBLocalPersistence, popupRedirectResolver: browserPopupRedirectResolver,
  })
  // Emulator configuration accepts only demo projects. The SDK's fixed DOM banner covers controls
  // and sits outside landmarks; keep emulator diagnostics in the console instead.
  if (emulatorHost) connectAuthEmulator(auth, `http://${emulatorHost}`, { disableWarnings: true })
  auth.languageCode = 'pl'
  const google = new GoogleAuthProvider()
  google.setCustomParameters({ prompt: 'select_account' })
  // authDomain is the configured Hosting domain; emulator emails must return to the local app.
  const emailActionSettings = () => ({ url: emulatorHost ? `${location.origin}/` : `https://${config.authDomain}/` })

  const refreshAttempts = new WeakMap<User, Promise<void>>()
  let verificationCheck: { user: User; result: Promise<AuthSession | null> } | undefined
  let cacheCleanupPending = readCacheCleanupPending()
  const startupCleanup = cacheCleanupPending ? clearLocalCache() : undefined

  async function clearLocalCache() {
    try {
      const { clearFirestoreCache } = await import('./createFirestoreRepositories')
      await clearFirestoreCache(cacheCleanupTimeoutMs)
      cacheCleanupPending = false
    } catch {
      cacheCleanupPending = true
      console.error('Failed to clear Firestore cache')
    }
    try {
      if (cacheCleanupPending) localStorage.setItem(cacheCleanupKey, 'pending')
      else if (readCacheCleanupPending()) localStorage.removeItem(cacheCleanupKey)
    } catch { /* The in-memory notice is still available if storage is blocked. */ }
  }

  async function checkSession(
    user: User, isCurrent = () => auth.currentUser === user, onChecking?: () => void,
  ): Promise<AuthSession | null> {
    const cachedSession = readCachedSession(user)
    // A non-forced token read can still make a network request when the token has expired.
    if (isOffline()) return cachedSession

    try {
      const emailVerified = await hasVerifiedEmailClaim(user)
      if (!isCurrent()) return null
      if (isOffline()) return cachedSession
      if (emailVerified || !cachedSession.emailVerified) {
        refreshAttempts.delete(user)
        return { ...cachedSession, emailVerified }
      }

      onChecking?.()
      // A forced refresh can notify onIdTokenChanged again. Share the attempt, including
      // a failure, until the mismatch clears or the app is reloaded via the session retry.
      let attempt = refreshAttempts.get(user)
      if (!attempt) {
        attempt = refreshVerifiedEmailClaim(user)
        refreshAttempts.set(user, attempt)
      }
      await attempt
      return isCurrent() ? { ...cachedSession, emailVerified: true } : null
    } catch (error) {
      if (!isCurrent()) return null
      if (isNetworkFailure(error)) return cachedSession
      throw error
    }
  }

  let redirectResult: ReturnType<typeof getRedirectResult> | undefined
  return {
    async register(email, password) {
      await createUserWithEmailAndPassword(auth, email, password)
    },
    async signIn(email, password) {
      await signInWithEmailAndPassword(auth, email, password)
    },
    async signInWithGoogle() {
      if (chooseGoogleSignInMethod(readEnvironment()) === 'redirect') await signInWithRedirect(auth, google)
      else await signInWithPopup(auth, google)
    },
    async completeGoogleRedirect() {
      redirectResult ??= getRedirectResult(auth)
      return (await redirectResult)?.operationType ?? null
    },
    async hasUnsentWrites() {
      try {
        if (auth.currentUser && createCompletedWorkoutStorage(auth.currentUser.uid).readAll().length > 0) return true
        const { hasUnsentWrites } = await import('./createFirestoreRepositories')
        return await hasUnsentWrites()
      } catch {
        return true
      }
    },
    async signOut() {
      if (auth.currentUser) {
        createActiveWorkoutRepository(auth.currentUser.uid).clear()
        createCompletedWorkoutStorage(auth.currentUser.uid).clear()
      }
      if (startupCleanup) await startupCleanup
      await clearLocalCache()
      await signOut(auth)
    },
    async sendVerificationEmail() {
      if (!auth.currentUser) throw new Error('Missing authentication session')
      await sendEmailVerification(auth.currentUser, emailActionSettings())
    },
    async refreshVerification() {
      const user = auth.currentUser
      if (!user) return null
      if (isOffline()) return readCachedSession(user)
      if (verificationCheck?.user === user) return verificationCheck.result
      // reload also notifies onIdTokenChanged, which publishes the checked session.
      const result = reload(user).then(async () => auth.currentUser === user ? checkSession(user) : null)
        .catch((error: unknown) => {
          if (auth.currentUser !== user) return null
          if (isNetworkFailure(error)) return readCachedSession(user)
          throw error
        })
        .finally(() => {
          if (verificationCheck?.result === result) verificationCheck = undefined
        })
      verificationCheck = { user, result }
      return result
    },
    async requestPasswordReset(email) {
      try {
        await sendPasswordResetEmail(auth, email, emailActionSettings())
      } catch (error) {
        // Older projects without enumeration protection can still return this code.
        if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'auth/user-not-found')) throw error
      }
    },
    subscribe(onState) {
      let revision = 0
      const unsubscribe = onIdTokenChanged(auth, async (user) => {
        if (auth.currentUser !== user) return
        const check = ++revision
        const isCurrent = () => check === revision && auth.currentUser === user
        try {
          if (startupCleanup) await startupCleanup
          if (!isCurrent()) return
          const session = user && await checkSession(user, isCurrent, () => onState({ status: 'loading' }))
          if (isCurrent()) onState(cacheCleanupPending ? { status: 'ready', session, cacheCleanupPending: true } : { status: 'ready', session })
        } catch {
          if (isCurrent()) onState({ status: 'error' })
        }
      }, () => {
        revision++
        onState({ status: 'error' })
      })
      return () => {
        revision++
        unsubscribe()
      }
    },
  }
}

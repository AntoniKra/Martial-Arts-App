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

function toSession(user: User | null): AuthSession | null {
  if (!user) return null
  if (typeof user.uid !== 'string' || !user.uid || typeof user.email !== 'string' || !user.email
    || typeof user.emailVerified !== 'boolean') throw new Error('Invalid authentication session')
  return { uid: user.uid, email: user.email, emailVerified: user.emailVerified }
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
    async signOut() {
      if (auth.currentUser) createActiveWorkoutRepository(auth.currentUser.uid).clear()
      try {
        const { clearFirestoreCache } = await import('./createFirestoreRepositories')
        await clearFirestoreCache()
      } catch (error) {
        console.error('Failed to clear Firestore cache during sign-out', error)
      }
      await signOut(auth)
    },
    async sendVerificationEmail() {
      if (!auth.currentUser) throw new Error('Missing authentication session')
      await sendEmailVerification(auth.currentUser)
    },
    async refreshVerification() {
      const user = auth.currentUser
      if (!user) return null
      await reload(user)
      return toSession(auth.currentUser)
    },
    async requestPasswordReset(email) {
      try {
        await sendPasswordResetEmail(auth, email)
      } catch (error) {
        // Older projects without enumeration protection can still return this code.
        if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'auth/user-not-found')) throw error
      }
    },
    subscribe(onSession, onError) {
      return onIdTokenChanged(auth, (user) => {
        try { onSession(toSession(user)) } catch { onError() }
      }, onError)
    },
  }
}

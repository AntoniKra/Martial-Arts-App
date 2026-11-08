import { initializeApp } from 'firebase/app'
import {
  connectAuthEmulator, createUserWithEmailAndPassword, indexedDBLocalPersistence,
  initializeAuth, onIdTokenChanged, reload, sendEmailVerification,
  sendPasswordResetEmail, signInWithEmailAndPassword, signOut,
  type User,
} from 'firebase/auth'

import type { AuthService, AuthSession } from '@/application/auth/authService'
import type { FirebaseConfig } from './firebaseConfig'

function toSession(user: User | null): AuthSession | null {
  if (!user) return null
  if (typeof user.uid !== 'string' || !user.uid || typeof user.email !== 'string' || !user.email
    || typeof user.emailVerified !== 'boolean') throw new Error('Invalid authentication session')
  return { uid: user.uid, email: user.email, emailVerified: user.emailVerified }
}

export function createFirebaseAuthService(config: FirebaseConfig): AuthService {
  const { emulatorHost, firestoreEmulatorHost: _firestoreHost, ...options } = config
  const auth = initializeAuth(initializeApp(options), { persistence: indexedDBLocalPersistence })
  // Emulator configuration accepts only demo projects. The SDK's fixed DOM banner covers controls
  // and sits outside landmarks; keep emulator diagnostics in the console instead.
  if (emulatorHost) connectAuthEmulator(auth, `http://${emulatorHost}`, { disableWarnings: true })
  auth.languageCode = 'pl'

  return {
    async register(email, password) {
      await createUserWithEmailAndPassword(auth, email, password)
    },
    async signIn(email, password) {
      await signInWithEmailAndPassword(auth, email, password)
    },
    async signOut() {
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

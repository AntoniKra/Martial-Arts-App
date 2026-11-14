export interface AuthSession {
  uid: string
  email: string
  emailVerified: boolean
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'ready'; session: AuthSession | null }
  | { status: 'error' }

export interface AuthService {
  register(email: string, password: string): Promise<void>
  signIn(email: string, password: string): Promise<void>
  /** Opens Google sign-in in a popup, or leaves the page for a redirect that completeGoogleRedirect finishes. */
  signInWithGoogle(): Promise<void>
  /** Settles the Google redirect that brought the user back to the app; rejects with its error. */
  completeGoogleRedirect(): Promise<'signIn' | 'link' | 'reauthenticate' | null>
  /** Checks the persistent write queue before sign-out; uncertainty requires a warning. */
  hasUnsentWrites(): Promise<boolean>
  signOut(): Promise<void>
  sendVerificationEmail(): Promise<void>
  refreshVerification(): Promise<AuthSession | null>
  requestPasswordReset(email: string): Promise<void>
  subscribe(onSession: (session: AuthSession | null) => void, onError: () => void): () => void
}

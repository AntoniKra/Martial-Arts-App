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
  signOut(): Promise<void>
  sendVerificationEmail(): Promise<void>
  refreshVerification(): Promise<AuthSession | null>
  requestPasswordReset(email: string): Promise<void>
  subscribe(onSession: (session: AuthSession | null) => void, onError: () => void): () => void
}

import { createContext, useContext } from 'react'
import type { AuthService, AuthState } from '@/application/auth/authService'

export interface AuthContextValue {
  service: AuthService
  state: AuthState
  busy: boolean
  verificationSentAt: number | null
  /** Why the last verification email could not be sent; shown on the verification screen. */
  verificationError: string | null
  /** Why the Google redirect that brought the user back failed; cleared by the next auth action. */
  redirectError: string | null
  redirectOperation: 'signIn' | 'link' | 'reauthenticate' | null | undefined
  /** Runs an auth action and returns a Polish error message, or null on success or user cancellation. Each screen keeps its own error. */
  execute(action: () => Promise<void>): Promise<string | null>
  /** Sends the verification email and records the result in verificationSentAt or verificationError. */
  sendVerification(): Promise<boolean>
  refreshVerification(): Promise<boolean>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider is missing')
  return context
}

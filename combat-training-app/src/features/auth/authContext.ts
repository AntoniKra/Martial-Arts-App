import { createContext, useContext } from 'react'
import type { AuthService, AuthState } from '@/application/auth/authService'

export interface AuthContextValue {
  service: AuthService
  state: AuthState
  busy: boolean
  error: string | null
  verificationSentAt: number | null
  execute(action: () => Promise<void>): Promise<boolean>
  sendVerification(): Promise<void>
  refreshVerification(): Promise<boolean>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider is missing')
  return context
}

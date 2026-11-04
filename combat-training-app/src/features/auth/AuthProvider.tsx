import { useEffect, useState, type PropsWithChildren } from 'react'
import type { AuthService, AuthState } from '@/application/auth/authService'
import { AuthContext } from './authContext'
import { mapAuthError } from './mapAuthError'

export function AuthProvider({ service, children }: PropsWithChildren<{ service: AuthService }>) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verificationSentAt, setVerificationSentAt] = useState<number | null>(null)

  useEffect(() => service.subscribe(
    (session) => setState({ status: 'ready', session }),
    () => setState({ status: 'error' }),
  ), [service])

  async function execute(action: () => Promise<void>): Promise<boolean> {
    setBusy(true)
    setError(null)
    try {
      await action()
      return true
    } catch (cause) {
      setError(mapAuthError(cause))
      return false
    } finally {
      setBusy(false)
    }
  }

  async function sendVerification() {
    await service.sendVerificationEmail()
    setVerificationSentAt(Date.now())
  }

  async function refreshVerification() {
    const session = await service.refreshVerification()
    setState({ status: 'ready', session })
    return session?.emailVerified === true
  }

  return (
    <AuthContext.Provider value={{ service, state, busy, error, verificationSentAt, execute, sendVerification, refreshVerification }}>
      {children}
    </AuthContext.Provider>
  )
}

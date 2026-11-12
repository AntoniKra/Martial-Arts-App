import { useEffect, useState, type PropsWithChildren } from 'react'
import type { AuthService, AuthState } from '@/application/auth/authService'
import { AuthContext } from './authContext'
import { mapAuthError } from './mapAuthError'

export function AuthProvider({ service, children }: PropsWithChildren<{ service: AuthService }>) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const [busy, setBusy] = useState(false)
  const [verificationSentAt, setVerificationSentAt] = useState<number | null>(null)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [redirectError, setRedirectError] = useState<string | null>(null)

  useEffect(() => service.subscribe(
    (session) => setState({ status: 'ready', session }),
    () => setState({ status: 'error' }),
  ), [service])

  useEffect(() => {
    let active = true
    service.completeGoogleRedirect().catch((cause: unknown) => {
      if (active) setRedirectError(mapAuthError(cause))
    })
    return () => { active = false }
  }, [service])

  async function execute(action: () => Promise<void>): Promise<string | null> {
    setBusy(true)
    setRedirectError(null)
    try {
      await action()
      return null
    } catch (cause) {
      return mapAuthError(cause)
    } finally {
      setBusy(false)
    }
  }

  async function sendVerification() {
    const error = await execute(() => service.sendVerificationEmail())
    setVerificationError(error)
    if (error === null) setVerificationSentAt(Date.now())
    return error === null
  }

  async function refreshVerification() {
    const session = await service.refreshVerification()
    setState({ status: 'ready', session })
    return session?.emailVerified === true
  }

  return (
    <AuthContext.Provider value={{ service, state, busy, verificationSentAt, verificationError, redirectError, execute, sendVerification, refreshVerification }}>
      {children}
    </AuthContext.Provider>
  )
}

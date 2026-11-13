import { useEffect, useState, type PropsWithChildren } from 'react'
import type { AuthService, AuthState } from '@/application/auth/authService'
import { AuthContext } from './authContext'
import { mapAuthError } from './mapAuthError'

export function AuthProvider({ service, children }: PropsWithChildren<{ service: AuthService }>) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const [busy, setBusy] = useState(false)
  const [verificationSentAt, setVerificationSentAt] = useState<number | null>(null)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [redirectOperation, setRedirectOperation] = useState<'signIn' | 'link' | 'reauthenticate' | null>()
  const [redirectCause, setRedirectCause] = useState<unknown>(null)
  const redirectError = redirectCause === null ? null : mapAuthError(redirectCause, state.status === 'ready' ? state.session?.email : undefined)

  useEffect(() => service.subscribe(
    (session) => setState({ status: 'ready', session }),
    () => setState({ status: 'error' }),
  ), [service])

  useEffect(() => {
    let active = true
    service.completeGoogleRedirect().then((operation) => {
      if (active) setRedirectOperation(operation)
    }).catch((cause: unknown) => {
      if (active) { setRedirectCause(cause); setRedirectOperation(null) }
    })
    return () => { active = false }
  }, [service])

  async function execute(action: () => Promise<void>): Promise<string | null> {
    setBusy(true)
    setRedirectCause(null)
    try {
      await action()
      return null
    } catch (cause) {
      return mapAuthError(cause, state.status === 'ready' ? state.session?.email : undefined)
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
    <AuthContext.Provider value={{ service, state, busy, verificationSentAt, verificationError, redirectError, redirectOperation, execute, sendVerification, refreshVerification }}>
      {children}
    </AuthContext.Provider>
  )
}

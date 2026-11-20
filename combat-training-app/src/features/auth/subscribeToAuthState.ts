import type { Dispatch, SetStateAction } from 'react'
import type { AuthService, AuthState } from '@/application/auth/authService'

const AUTH_STARTUP_TIMEOUT_MS = 15_000

export function subscribeToAuthState(
  service: Pick<AuthService, 'subscribe'>,
  setState: Dispatch<SetStateAction<AuthState>>,
): () => void {
  const timer = setTimeout(() => {
    setState((current) => current.status === 'loading' ? { status: 'error' } : current)
  }, AUTH_STARTUP_TIMEOUT_MS)

  const unsubscribe = service.subscribe(
    (session) => {
      clearTimeout(timer)
      setState({ status: 'ready', session })
    },
    () => {
      clearTimeout(timer)
      setState({ status: 'error' })
    },
  )

  return () => {
    clearTimeout(timer)
    unsubscribe()
  }
}

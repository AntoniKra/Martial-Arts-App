import type { Dispatch, SetStateAction } from 'react'
import type { AuthService, AuthState } from '@/application/auth/authService'

const AUTH_STARTUP_TIMEOUT_MS = 15_000

export function subscribeToAuthState(
  service: Pick<AuthService, 'subscribe'>,
  setState: Dispatch<SetStateAction<AuthState>>,
): () => void {
  const onTimeout = () => {
    setState((current) => current.status === 'loading' ? { status: 'error' } : current)
  }
  let checking = true
  let timer = setTimeout(onTimeout, AUTH_STARTUP_TIMEOUT_MS)

  const unsubscribe = service.subscribe((state) => {
    if (state.status === 'loading') {
      if (checking) return
      checking = true
      timer = setTimeout(onTimeout, AUTH_STARTUP_TIMEOUT_MS)
    } else {
      checking = false
      clearTimeout(timer)
    }
    setState(state)
  })

  return () => {
    clearTimeout(timer)
    unsubscribe()
  }
}

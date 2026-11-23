import type { AuthSession } from '@/application/auth/authService'

export function subscribeToVerificationOnReturn(session: AuthSession | null, refreshVerification: () => Promise<boolean>) {
  if (session?.emailVerified !== false) return

  function checkWhenVisible() {
    if (document.visibilityState === 'visible' && navigator.onLine !== false) void refreshVerification()
  }

  document.addEventListener('visibilitychange', checkWhenVisible)
  window.addEventListener('focus', checkWhenVisible)
  return () => {
    document.removeEventListener('visibilitychange', checkWhenVisible)
    window.removeEventListener('focus', checkWhenVisible)
  }
}

import type { AuthState } from './authService'

type AuthRouteDecision =
  | { type: 'allow' | 'loading' | 'error' }
  | { type: 'redirect'; to: string; returnTo?: string }

const authPaths = ['/login', '/register', '/forgot-password', '/verify-email']

export function isActiveWorkoutPath(pathname: string): boolean {
  return /^\/quick-timer\/active\/?$/.test(pathname) || /^\/workouts\/[^/]+\/active\/?$/.test(pathname)
}

export function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) return '/'
  // The router matches paths case-insensitively, so the blocklist must too.
  const pathname = value.split(/[?#]/)[0].replace(/\/+$/, '').toLowerCase() || '/'
  return authPaths.includes(pathname) || pathname === '/profile/delete-account' ? '/' : value
}

export function resolveAuthRoute(
  state: AuthState,
  pathname: string,
  target: string = pathname,
  activeWorkoutAdmitted = false,
  returnTo?: unknown,
): AuthRouteDecision {
  pathname = pathname.replace(/\/+$/, '') || '/'
  // Admission belongs to this mounted player, never to a direct unauthenticated visit.
  if (activeWorkoutAdmitted && isActiveWorkoutPath(pathname)) return { type: 'allow' }
  if (state.status === 'loading') return { type: 'loading' }
  if (state.status === 'error') return { type: 'error' }
  const isAuthPath = authPaths.includes(pathname)
  if (!state.session) {
    return isAuthPath && pathname !== '/verify-email'
      ? { type: 'allow' }
      : { type: 'redirect', to: '/login', returnTo: pathname === '/verify-email' ? safeReturnTo(returnTo) : safeReturnTo(target) }
  }
  if (!state.session.emailVerified) {
    return pathname === '/verify-email'
      ? { type: 'allow' }
      : { type: 'redirect', to: '/verify-email', returnTo: isAuthPath ? safeReturnTo(returnTo) : safeReturnTo(target) }
  }
  // A persisted verified session is sufficient, including while offline.
  return isAuthPath ? { type: 'redirect', to: safeReturnTo(returnTo) } : { type: 'allow' }
}

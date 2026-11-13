import { describe, expect, it } from 'vitest'
import type { AuthState } from './authService'
import { resolveAuthRoute, safeReturnTo } from './resolveAuthRoute'

const signedOut: AuthState = { status: 'ready', session: null }
const verified: AuthState = { status: 'ready', session: { uid: 'athlete', email: 'athlete@example.test', emailVerified: true } }
const unverified: AuthState = { status: 'ready', session: { ...verified.session!, emailVerified: false } }

describe('resolveAuthRoute', () => {
  it('waits for the restored session without flashing login', () => {
    expect(resolveAuthRoute({ status: 'loading' }, '/workouts')).toEqual({ type: 'loading' })
  })
  it('shows a session error instead of treating it as a signed out session', () => {
    expect(resolveAuthRoute({ status: 'error' }, '/')).toEqual({ type: 'error' })
  })
  it('preserves the complete protected destination', () => {
    expect(resolveAuthRoute(signedOut, '/workouts', '/workouts?tab=plans#list'))
      .toEqual({ type: 'redirect', to: '/login', returnTo: '/workouts?tab=plans#list' })
  })
  it.each(['/login', '/register', '/forgot-password'])('allows signed out access to %s', (path) => {
    expect(resolveAuthRoute(signedOut, path)).toEqual({ type: 'allow' })
  })
  it('does not show verification without a session', () => {
    expect(resolveAuthRoute(signedOut, '/verify-email')).toEqual({ type: 'redirect', to: '/login', returnTo: '/' })
  })
  it.each(['/', '/workouts', '/login', '/register', '/forgot-password'])('requires verification at %s', (path) => {
    expect(resolveAuthRoute(unverified, path)).toMatchObject({ type: 'redirect', to: '/verify-email' })
  })
  it('allows an unverified user to verify the address', () => {
    expect(resolveAuthRoute(unverified, '/verify-email')).toEqual({ type: 'allow' })
  })
  it.each(['/login', '/register', '/forgot-password', '/verify-email'])('redirects a complete session from %s', (path) => {
    expect(resolveAuthRoute(verified, path)).toEqual({ type: 'redirect', to: '/' })
  })
  it('accepts an IndexedDB session offline without a network prerequisite', () => {
    expect(resolveAuthRoute(verified, '/workouts')).toEqual({ type: 'allow' })
  })
  it('returns to the protected destination after login or verification', () => {
    expect(resolveAuthRoute(verified, '/login', undefined, false, '/workouts?tab=plans#list'))
      .toEqual({ type: 'redirect', to: '/workouts?tab=plans#list' })
    expect(resolveAuthRoute(unverified, '/login', undefined, false, '/workouts'))
      .toEqual({ type: 'redirect', to: '/verify-email', returnTo: '/workouts' })
    expect(resolveAuthRoute(verified, '/verify-email', undefined, false, '/workouts'))
      .toEqual({ type: 'redirect', to: '/workouts' })
  })
  it('handles trailing slashes on public routes without redirect loops', () => {
    expect(resolveAuthRoute(signedOut, '/login/')).toEqual({ type: 'allow' })
    expect(resolveAuthRoute(verified, '/login/', undefined, false, '/login/')).toEqual({ type: 'redirect', to: '/' })
  })
  it.each([signedOut, unverified, { status: 'loading' } as const, { status: 'error' } as const])('keeps an admitted player mounted on session loss: %j', (state) => {
    expect(resolveAuthRoute(state, '/workouts/plan/active', undefined, true)).toEqual({ type: 'allow' })
  })
  it('requires a session for a direct player entry', () => {
    expect(resolveAuthRoute(signedOut, '/workouts/plan/active')).toMatchObject({ type: 'redirect', to: '/login' })
  })
  it('does not extend the player exception to other routes', () => {
    expect(resolveAuthRoute(signedOut, '/workouts', undefined, true)).toMatchObject({ type: 'redirect', to: '/login' })
  })
})

describe('safeReturnTo', () => {
  it.each([undefined, null, '//example.test', '/\\example.test', 'https://example.test', '/login', '/verify-email?next=/'])('rejects unsafe or circular destination %j', (value) => {
    expect(safeReturnTo(value)).toBe('/')
  })
})

it.each(['/profile/delete-account', '/profile/delete-account/', '/profile/delete-account?step=confirmed#delete'])('never returns to account deletion after login: %s', (path) => {
  expect(safeReturnTo(path)).toBe('/')
  expect(resolveAuthRoute(signedOut, '/profile/delete-account', path)).toMatchObject({ to: '/login', returnTo: '/' })
})

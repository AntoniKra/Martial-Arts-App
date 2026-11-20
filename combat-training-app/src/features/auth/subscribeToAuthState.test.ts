import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthService, AuthState } from '@/application/auth/authService'
import { subscribeToAuthState } from './subscribeToAuthState'

const session = { uid: 'athlete', email: 'athlete@example.test', emailVerified: true }

function startSubscription() {
  let state: AuthState = { status: 'loading' }
  const unsubscribe = vi.fn()
  const subscribe = vi.fn<AuthService['subscribe']>(() => unsubscribe)
  const unmount = subscribeToAuthState({ subscribe }, (update) => {
    state = typeof update === 'function' ? update(state) : update
  })
  const [emitSession] = subscribe.mock.calls[0]

  return { readState: () => state, emitSession, unmount, unsubscribe }
}

describe('auth startup timeout', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('sets the session error after 15 seconds of loading', () => {
    const { readState } = startSubscription()

    vi.advanceTimersByTime(14_999)
    expect(readState()).toEqual({ status: 'loading' })

    vi.advanceTimersByTime(1)
    expect(readState()).toEqual({ status: 'error' })
  })

  it('clears the timeout when a session arrives before the deadline', () => {
    const { readState, emitSession } = startSubscription()

    vi.advanceTimersByTime(14_999)
    emitSession(session)
    expect(vi.getTimerCount()).toBe(0)

    vi.advanceTimersByTime(1)
    expect(readState()).toEqual({ status: 'ready', session })
  })

  it('becomes ready when a session arrives after the timeout', () => {
    const { readState, emitSession, unsubscribe } = startSubscription()

    vi.advanceTimersByTime(15_000)
    expect(readState()).toEqual({ status: 'error' })
    expect(unsubscribe).not.toHaveBeenCalled()

    emitSession(session)
    expect(readState()).toEqual({ status: 'ready', session })
  })

  it('clears the timeout and unsubscribes when unmounted', () => {
    const { readState, unmount, unsubscribe } = startSubscription()

    unmount()
    expect(vi.getTimerCount()).toBe(0)
    expect(unsubscribe).toHaveBeenCalledOnce()

    vi.advanceTimersByTime(15_000)
    expect(readState()).toEqual({ status: 'loading' })
  })
})

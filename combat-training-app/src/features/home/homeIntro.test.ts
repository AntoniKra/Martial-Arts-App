import { afterEach, describe, expect, it, vi } from 'vitest'
import { HOME_INTRO_SESSION_KEY, homeIntroDuration, startHomeIntro } from './homeIntro'

function environment() {
  const values = new Map<string, string>()
  return {
    storage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } },
    motion: Object.assign(new EventTarget(), { matches: false }), events: new EventTarget(),
    duration: 800, show: vi.fn(), hide: vi.fn(),
  }
}
afterEach(() => { vi.useRealTimers() })

describe('Start greeting', () => {
  it.each([['300ms', '250ms'], ['.3s', '.25s'], [' 0.3s ', '250ms']])('lasts 800ms with slow=%s and medium=%s, including minified CSS', (slow, medium) => {
    expect(homeIntroDuration({ getPropertyValue: (token) => token === '--motion-slow' ? slow : medium })).toBe(800)
  })
  it('plays once per session, including after reload or returning to Start', () => {
    vi.useFakeTimers()
    const env = environment()
    startHomeIntro(env)
    expect(env.show).toHaveBeenCalledOnce()
    expect(env.storage.getItem(HOME_INTRO_SESSION_KEY)).toBe('true')
    vi.advanceTimersByTime(799)
    expect(env.hide).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(env.hide).toHaveBeenCalledOnce()
    startHomeIntro(env)
    expect(env.show).toHaveBeenCalledOnce()
    const fresh = environment()
    startHomeIntro(fresh)()
    expect(fresh.show).toHaveBeenCalledOnce()
  })
  it.each(['pointerdown', 'keydown'])('dismisses on %s without cancelling the underlying action', (type) => {
    vi.useFakeTimers()
    const env = environment()
    startHomeIntro(env)
    const event = new Event(type, { cancelable: true })
    env.events.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(env.hide).toHaveBeenCalledOnce()
    vi.runAllTimers()
    expect(env.hide).toHaveBeenCalledOnce()
    startHomeIntro(env)
    expect(env.show).toHaveBeenCalledOnce()
  })
  it('does not play with reduced motion or claim the greeting', () => {
    const env = environment()
    env.motion.matches = true
    startHomeIntro(env)()
    expect(env.show).not.toHaveBeenCalled()
    expect(env.storage.getItem(HOME_INTRO_SESSION_KEY)).toBeNull()
  })
  it('stops immediately when the motion preference changes', () => {
    const env = environment()
    startHomeIntro(env)
    env.motion.matches = true
    env.motion.dispatchEvent(new Event('change'))
    expect(env.hide).toHaveBeenCalledOnce()
  })
  it('cleans up listeners and the timer on leaving Start', () => {
    vi.useFakeTimers()
    const env = environment()
    const dispose = startHomeIntro(env)
    dispose(); dispose()
    env.events.dispatchEvent(new Event('pointerdown'))
    vi.runAllTimers()
    expect(env.hide).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
  it.each(['getItem', 'setItem'] as const)('keeps content usable if storage.%s is unavailable', (method) => {
    const env = environment()
    env.storage[method] = () => { throw new Error('Storage unavailable') }
    expect(() => startHomeIntro(env)()).not.toThrow()
    expect(env.show).not.toHaveBeenCalled()
  })
})

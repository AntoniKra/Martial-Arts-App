import { afterEach, describe, expect, it, vi } from 'vitest'

import { createWebAudioWorkoutGong } from '@/infrastructure/audio/webAudioWorkoutGong'

function audioContext() {
  const oscillators: { frequency: { setValueAtTime: ReturnType<typeof vi.fn> }; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; onended: (() => void) | null }[] = []
  const gains: { gain: { setValueAtTime: ReturnType<typeof vi.fn>; linearRampToValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> }; disconnect: ReturnType<typeof vi.fn> }[] = []
  const source = { connect: vi.fn(), start: vi.fn(), disconnect: vi.fn(), buffer: null, onended: null }
  const context = {
    state: 'running' as AudioContextState,
    currentTime: 5,
    sampleRate: 44100,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    createBuffer: vi.fn(() => ({})),
    createBufferSource: vi.fn(() => source),
    createOscillator: vi.fn(() => {
      const oscillator = { type: 'sine', frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(), onended: null as (() => void) | null }
      oscillators.push(oscillator)
      return oscillator
    }),
    createGain: vi.fn(() => {
      const gain = { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() }
      gains.push(gain)
      return gain
    }),
  }
  // The adapter only needs these Web Audio methods; no real audio device exists in Node.
  const factory = vi.fn(() => context as unknown as AudioContext)
  return { context, factory, source, oscillators, gains }
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('web audio workout gong', () => {
  it('creates, resumes and primes audio synchronously only when unlocked by a click', () => {
    const { factory, context, source } = audioContext()
    const gong = createWebAudioWorkoutGong(factory)
    gong.play('workEnd')
    expect(factory).not.toHaveBeenCalled()
    gong.unlock()
    expect(factory).toHaveBeenCalledOnce()
    expect(context.resume).toHaveBeenCalledOnce()
    expect(source.start).toHaveBeenCalledOnce()
    expect(context.createOscillator).not.toHaveBeenCalled()
    gong.unlock()
    expect(factory).toHaveBeenCalledOnce()
  })

  it.each([
    ['workEnd', 3, 520], ['restEnd', 6, 880], ['workoutEnd', 9, 660],
  ] as const)('synthesizes the distinct %s cue with a bounded envelope', (signal, partialCount, frequency) => {
    const { factory, oscillators, gains } = audioContext()
    const gong = createWebAudioWorkoutGong(factory)
    gong.unlock()
    gong.play(signal)
    expect(oscillators).toHaveLength(partialCount)
    expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(frequency, 5)
    expect(gains[0].gain.setValueAtTime).toHaveBeenCalledWith(0, 5)
    expect(gains[0].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.32, 5.008)
    expect(oscillators.every((oscillator) => oscillator.stop.mock.calls[0][0] <= 6.2)).toBe(true)
    oscillators[0].onended?.()
    expect(oscillators[0].disconnect).toHaveBeenCalledOnce()
    expect(gains[0].disconnect).toHaveBeenCalledOnce()
  })

  it('closes the context on exit and can be unlocked for a later mount', () => {
    const { factory, context } = audioContext()
    const gong = createWebAudioWorkoutGong(factory)
    gong.unlock()
    gong.dispose()
    gong.play('workEnd')
    expect(context.close).toHaveBeenCalledOnce()
    expect(context.createOscillator).not.toHaveBeenCalled()
    gong.unlock()
    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('resumes a suspended context and plays only the latest requested cue', async () => {
    const { factory, context, oscillators } = audioContext()
    const gong = createWebAudioWorkoutGong(factory)
    gong.unlock()
    context.state = 'suspended'
    gong.play('workEnd')
    gong.play('restEnd')
    context.state = 'running'
    await Promise.resolve()
    expect(oscillators).toHaveLength(6)
    expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(880, 5)
  })

  it('does not play a cue after disposal while resume is pending', async () => {
    const { factory, context, oscillators } = audioContext()
    const gong = createWebAudioWorkoutGong(factory)
    gong.unlock()
    context.state = 'suspended'
    gong.play('workEnd')
    gong.dispose()
    context.state = 'running'
    await Promise.resolve()
    expect(oscillators).toHaveLength(0)
  })

  it('drops a cue if browser resume was delayed by more than a second', async () => {
    vi.useFakeTimers()
    const { factory, context, oscillators } = audioContext()
    const gong = createWebAudioWorkoutGong(factory)
    gong.unlock()
    context.state = 'suspended'
    gong.play('workEnd')
    vi.advanceTimersByTime(1500)
    context.state = 'running'
    await Promise.resolve()
    expect(oscillators).toHaveLength(0)
  })

  it('handles missing APIs and context construction errors without throwing', () => {
    for (const factory of [() => null, () => { throw new Error('No audio device') }]) {
      const gong = createWebAudioWorkoutGong(factory)
      expect(() => { gong.unlock(); gong.play('workEnd'); gong.dispose() }).not.toThrow()
    }
  })

  it('handles autoplay denial and close rejection without unhandled promises', async () => {
    const { factory, context } = audioContext()
    context.resume.mockRejectedValue(new Error('Autoplay denied'))
    context.close.mockRejectedValue(new Error('Device closed'))
    const gong = createWebAudioWorkoutGong(factory)
    gong.unlock()
    context.state = 'suspended'
    gong.play('workEnd')
    gong.dispose()
    await Promise.resolve()
    await Promise.resolve()
    expect(context.createOscillator).not.toHaveBeenCalled()
  })

  it('falls back to the prefixed AudioContext used by older Safari versions', () => {
    const { context } = audioContext()
    const constructor = vi.fn(function () { return context })
    vi.stubGlobal('window', { webkitAudioContext: constructor })
    const gong = createWebAudioWorkoutGong()
    gong.unlock()
    expect(constructor).toHaveBeenCalledOnce()
    expect(context.resume).toHaveBeenCalledOnce()
  })
})

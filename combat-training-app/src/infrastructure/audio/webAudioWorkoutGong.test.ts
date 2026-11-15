import { afterEach, describe, expect, it, vi } from 'vitest'

import { createWebAudioWorkoutGong } from '@/infrastructure/audio/webAudioWorkoutGong'
import { createWorkoutGongController } from '@/features/workout-player/utils/createWorkoutGongController'
import { playbackStep } from '@/test/workoutBuilders'

function audioContext() {
  const oscillators: { type: string; frequency: { setValueAtTime: ReturnType<typeof vi.fn> }; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; onended: (() => void) | null }[] = []
  const gains: { gain: { setValueAtTime: ReturnType<typeof vi.fn>; linearRampToValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> }; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = []
  const filters: { type: string; frequency: { setValueAtTime: ReturnType<typeof vi.fn> }; Q: { setValueAtTime: ReturnType<typeof vi.fn> }; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = []
  const parameter = () => ({ setValueAtTime: vi.fn() })
  const compressor = { threshold: parameter(), knee: parameter(), ratio: parameter(), attack: parameter(), release: parameter(), connect: vi.fn() }
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
    createDynamicsCompressor: vi.fn(() => compressor),
    createBiquadFilter: vi.fn(() => {
      const filter = { type: '', frequency: parameter(), Q: parameter(), connect: vi.fn(), disconnect: vi.fn() }
      filters.push(filter)
      return filter
    }),
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
  return { context, factory, source, oscillators, gains, filters, compressor }
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
    expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(frequency, 5.03)
    expect(gains[2].gain.setValueAtTime).toHaveBeenCalledWith(0, 5.03)
    expect(gains[2].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.32, 5.03 + 0.008)
    expect(oscillators.every((oscillator) => oscillator.stop.mock.calls[0][0] <= 6.24)).toBe(true)
    oscillators[0].onended?.()
    expect(oscillators[0].disconnect).toHaveBeenCalledOnce()
    expect(gains[2].disconnect).toHaveBeenCalledOnce()
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

  it('routes every signal through one boosted, compressed output', () => {
    const { factory, context, gains, compressor } = audioContext()
    const gong = createWebAudioWorkoutGong(factory)
    gong.unlock()
    gong.unlock()
    for (const signal of ['endingSoon', 'workEnd', 'restEnd', 'workoutEnd'] as const) gong.play(signal)
    expect(context.createDynamicsCompressor).toHaveBeenCalledOnce()
    expect(gains[0].gain.setValueAtTime).toHaveBeenCalledWith(3, 5)
    expect(compressor.threshold.setValueAtTime).toHaveBeenCalledWith(-3, 5)
    expect(compressor.knee.setValueAtTime).toHaveBeenCalledWith(0, 5)
    expect(compressor.ratio.setValueAtTime).toHaveBeenCalledWith(20, 5)
    expect(compressor.attack.setValueAtTime).toHaveBeenCalledWith(0, 5)
    expect(compressor.release.setValueAtTime).toHaveBeenCalledWith(0.1, 5)
    expect(gains[1].gain.setValueAtTime).toHaveBeenCalledWith(0.9, 5)
    expect(compressor.connect).toHaveBeenCalledWith(gains[1])
  })

  it('synthesizes three harmonic knocks lasting 120 ms with 200 ms gaps and a fast attack', () => {
    const { factory, oscillators, gains, filters } = audioContext()
    const gong = createWebAudioWorkoutGong(factory)
    gong.unlock()
    gong.play('endingSoon')
    expect(oscillators).toHaveLength(6)
    expect(filters).toHaveLength(3)
    for (const [index, offset] of [0, 0.32, 0.64].entries()) {
      const filter = filters[index]
      expect(filter.type).toBe('bandpass')
      expect(filter.frequency.setValueAtTime).toHaveBeenCalledWith(3000, 5.03 + offset)
      expect(filter.Q.setValueAtTime).toHaveBeenCalledWith(0.8, 5.03 + offset)
      for (const [partial, type, frequency, volume] of [[0, 'square', 2500, 0.6], [1, 'triangle', 3500, 0.2]] as const) {
        const oscillator = oscillators[index * 2 + partial]
        const gain = gains[2 + index * 2 + partial]
        expect(oscillator.type).toBe(type)
        expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(frequency, 5.03 + offset)
        expect(oscillator.start).toHaveBeenCalledWith(5.03 + offset)
        expect(oscillator.stop.mock.calls[0][0]).toBeCloseTo(5.03 + offset + 0.12)
        expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0, 5.03 + offset)
        expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(volume, 5.03 + offset + 0.002)
        expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, 5.03 + offset + 0.12)
        oscillator.onended?.()
        expect(oscillator.disconnect).toHaveBeenCalledOnce()
        expect(gain.disconnect).toHaveBeenCalledOnce()
      }
      expect(filter.disconnect).toHaveBeenCalledOnce()
    }
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
    expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(880, 5.03)
  })

  it.each([
    { transitionFirst: false, resumeDelayMs: 0 },
    { transitionFirst: true, resumeDelayMs: 0 },
    { transitionFirst: false, resumeDelayMs: 999 },
    { transitionFirst: false, resumeDelayMs: 1000 },
  ])('selects the warning before deferred resume, transition first: $transitionFirst, delay: $resumeDelayMs ms', async ({ transitionFirst, resumeDelayMs }) => {
    vi.useFakeTimers()
    const { factory, context, oscillators } = audioContext()
    const gong = createWebAudioWorkoutGong(factory)
    const controller = createWorkoutGongController([
      playbackStep('work', 40), { ...playbackStep('rest', 20), kind: 'roundRest' }, playbackStep('next', 40),
    ], gong)
    controller.unlock()
    context.state = 'suspended'
    const pendingResumes: (() => void)[] = []
    context.resume.mockImplementation(() => new Promise<void>((resolve) => pendingResumes.push(resolve)))
    const transition = () => controller.onPlaybackEvent({
      type: 'stepFinalized', stepIndex: 0, playbackStepId: 'work', performedDurationSeconds: 40,
      performedDurationMs: 40_000, outcome: 'completed', reason: 'elapsed',
    })
    if (transitionFirst) transition()
    controller.playEndWarning()
    if (!transitionFirst) transition()
    await Promise.resolve()
    expect(oscillators).toHaveLength(0)
    vi.advanceTimersByTime(resumeDelayMs)
    context.state = 'running'
    pendingResumes.forEach((resolve) => resolve())
    await Promise.resolve()
    const expectedPartials = resumeDelayMs < 1000 ? 6 : 0
    expect(oscillators).toHaveLength(expectedPartials)
    if (expectedPartials > 0) {
      expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(2500, 5.03)
    }
    expect(context.resume).toHaveBeenCalledTimes(2) // Unlock and one selected cue.
    await Promise.resolve()
    expect(oscillators).toHaveLength(expectedPartials)
    controller.dispose()
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

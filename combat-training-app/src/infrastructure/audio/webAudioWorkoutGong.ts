import type { WorkoutGong, WorkoutGongSignal } from '@/application/audio/workoutGong'

function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null
  }

  const AudioContextConstructor = window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  return AudioContextConstructor ? new AudioContextConstructor() : null
}

function createSignalOutput(context: AudioContext): GainNode {
  const input = context.createGain()
  const compressor = context.createDynamicsCompressor()
  const output = context.createGain()
  // Boost quiet bell tails, then constrain summed partials before the final output.
  input.gain.setValueAtTime(3, context.currentTime)
  compressor.threshold.setValueAtTime(-3, context.currentTime)
  compressor.knee.setValueAtTime(0, context.currentTime)
  compressor.ratio.setValueAtTime(20, context.currentTime)
  compressor.attack.setValueAtTime(0, context.currentTime)
  compressor.release.setValueAtTime(0.1, context.currentTime)
  output.gain.setValueAtTime(0.9, context.currentTime)
  input.connect(compressor)
  compressor.connect(output)
  output.connect(context.destination)
  return input
}

function strike(context: AudioContext, output: AudioNode, frequency: number, startsAt: number, duration: number): void {
  // Inharmonic partials and a short attack give the synthesized bell a clear onset.
  for (const [ratio, volume] of [[1, 0.32], [1.48, 0.12], [2.1, 0.06]]) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency * ratio, startsAt)
    gain.gain.setValueAtTime(0, startsAt)
    gain.gain.linearRampToValueAtTime(volume, startsAt + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.001, startsAt + duration)
    oscillator.connect(gain)
    gain.connect(output)
    oscillator.onended = () => {
      oscillator.disconnect()
      gain.disconnect()
    }
    oscillator.start(startsAt)
    oscillator.stop(startsAt + duration)
  }
}

function knock(context: AudioContext, output: AudioNode, startsAt: number): void {
  const filter = context.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(3000, startsAt)
  filter.Q.setValueAtTime(0.8, startsAt)
  filter.connect(output)
  let remainingSources = 2
  for (const [type, frequency, volume] of [['square', 2500, 0.6], ['triangle', 3500, 0.2]] as const) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, startsAt)
    gain.gain.setValueAtTime(0, startsAt)
    gain.gain.linearRampToValueAtTime(volume, startsAt + 0.002)
    gain.gain.exponentialRampToValueAtTime(0.001, startsAt + 0.12)
    oscillator.connect(gain)
    gain.connect(filter)
    oscillator.onended = () => {
      oscillator.disconnect()
      gain.disconnect()
      remainingSources -= 1
      if (remainingSources === 0) filter.disconnect()
    }
    oscillator.start(startsAt)
    oscillator.stop(startsAt + 0.12)
  }
}

function playSignal(context: AudioContext, output: AudioNode, signal: WorkoutGongSignal): void {
  // Give a newly unlocked compressor time to settle before the sharp first attack.
  const now = context.currentTime + 0.03

  switch (signal) {
    case 'workEnd':
      strike(context, output, 520, now, 0.8)
      return
    case 'restEnd':
      strike(context, output, 880, now, 0.25)
      strike(context, output, 880, now + 0.2, 0.4)
      return
    case 'workoutEnd':
      strike(context, output, 660, now, 0.3)
      strike(context, output, 880, now + 0.25, 0.3)
      strike(context, output, 1100, now + 0.5, 0.7)
      return
    case 'endingSoon':
      // Three sharp 120 ms knocks separated by 200 ms of silence.
      knock(context, output, now)
      knock(context, output, now + 0.32)
      knock(context, output, now + 0.64)
  }
}

export function createWebAudioWorkoutGong(
  contextFactory: () => AudioContext | null = createAudioContext,
): WorkoutGong {
  let context: AudioContext | null = null
  let output: GainNode | null = null
  let playRevision = 0

  return {
    unlock() {
      try {
        if (context === null || context.state === 'closed') {
          context = contextFactory()
          output = context ? createSignalOutput(context) : null
        }

        if (context === null) {
          return
        }

        // Both calls must happen in the click handler, before any await (iOS Safari).
        void context.resume().catch(() => {})
        const source = context.createBufferSource()
        source.buffer = context.createBuffer(1, 1, context.sampleRate)
        source.connect(context.destination)
        source.onended = () => source.disconnect()
        source.start()
      } catch {
        // Audio is optional; unsupported APIs and autoplay denial must not stop playback.
      }
    },
    play(signal) {
      const current = context
      const currentOutput = output
      const revision = ++playRevision
      const requestedAt = Date.now()

      if (current === null || currentOutput === null || current.state === 'closed') {
        return
      }

      const playIfCurrent = () => {
        if (context === current && revision === playRevision && current.state === 'running' &&
            Date.now() - requestedAt < 1000) {
          playSignal(current, currentOutput, signal)
        }
      }

      try {
        if (current.state === 'running') {
          playIfCurrent()
        } else {
          // A previously unlocked context may be suspended while the tab is hidden.
          void current.resume().then(playIfCurrent).catch(() => {})
        }
      } catch {
        // A device or browser audio failure must not interrupt the timer.
      }
    },
    dispose() {
      const previous = context
      context = null
      output = null
      playRevision += 1

      try {
        if (previous !== null && previous.state !== 'closed') {
          void previous.close().catch(() => {})
        }
      } catch {
        // Cleanup is best effort, including browsers that already closed the context.
      }
    },
  }
}

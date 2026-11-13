import type { WorkoutGong, WorkoutGongSignal } from '@/application/audio/workoutGong'

function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null
  }

  const AudioContextConstructor = window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  return AudioContextConstructor ? new AudioContextConstructor() : null
}

function strike(context: AudioContext, frequency: number, startsAt: number, duration: number): void {
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
    gain.connect(context.destination)
    oscillator.onended = () => {
      oscillator.disconnect()
      gain.disconnect()
    }
    oscillator.start(startsAt)
    oscillator.stop(startsAt + duration)
  }
}

function playSignal(context: AudioContext, signal: WorkoutGongSignal): void {
  const now = context.currentTime

  switch (signal) {
    case 'workEnd':
      strike(context, 520, now, 0.8)
      return
    case 'restEnd':
      strike(context, 880, now, 0.25)
      strike(context, 880, now + 0.2, 0.4)
      return
    case 'workoutEnd':
      strike(context, 660, now, 0.3)
      strike(context, 880, now + 0.25, 0.3)
      strike(context, 1100, now + 0.5, 0.7)
      return
    case 'endingSoon':
      // Short, low percussive knocks, distinct from the sustained transition bells.
      strike(context, 220, now, 0.04)
      strike(context, 220, now + 0.12, 0.04)
      strike(context, 220, now + 0.24, 0.04)
  }
}

export function createWebAudioWorkoutGong(
  contextFactory: () => AudioContext | null = createAudioContext,
): WorkoutGong {
  let context: AudioContext | null = null
  let playRevision = 0

  return {
    unlock() {
      try {
        if (context === null || context.state === 'closed') {
          context = contextFactory()
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
      const revision = ++playRevision
      const requestedAt = Date.now()

      if (current === null || current.state === 'closed') {
        return
      }

      const playIfCurrent = () => {
        if (context === current && revision === playRevision && current.state === 'running' &&
            Date.now() - requestedAt < 1000) {
          playSignal(current, signal)
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

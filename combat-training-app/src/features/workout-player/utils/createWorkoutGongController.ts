import type { WorkoutGong } from '@/application/audio/workoutGong'
import type { WorkoutPlaybackStep } from '@/domain/workout-playback/workoutPlayback.types'
import type { WorkoutPlaybackEvent } from '@/features/workout-player/types/workoutPlaybackEvents.types'
import { selectWorkoutGongSignal } from '@/features/workout-player/utils/selectWorkoutGongSignal'

export function createWorkoutGongController(steps: readonly WorkoutPlaybackStep[], gong: WorkoutGong) {
  let events: WorkoutPlaybackEvent[] = []
  let endWarningPending = false
  let scheduled = false
  let generation = 0

  function reset(): void {
    events = []
    endWarningPending = false
    scheduled = false
    generation += 1
  }

  function scheduleFlush(): void {
    if (scheduled) {
      return
    }

    scheduled = true
    const scheduledGeneration = generation
    // Select one cue from the entire reconciliation before any asynchronous audio resume.
    queueMicrotask(() => {
      if (generation !== scheduledGeneration) {
        return
      }

      const transitionSignal = selectWorkoutGongSignal(events, steps)
      const signal = transitionSignal === 'workoutEnd' ? transitionSignal :
        endWarningPending ? 'endingSoon' : transitionSignal
      events = []
      endWarningPending = false
      scheduled = false
      if (signal !== null) {
        gong.play(signal)
      }
    })
  }

  return {
    unlock: () => gong.unlock(),
    playEndWarning() {
      endWarningPending = true
      scheduleFlush()
    },
    onPlaybackEvent(event: WorkoutPlaybackEvent) {
      if (event.type === 'restarted') {
        reset()
        return
      }

      if (event.type === 'stepFinalized' && event.reason !== 'elapsed') {
        endWarningPending = false
      }
      events.push(event)
      scheduleFlush()
    },
    dispose() {
      reset()
      gong.dispose()
    },
  }
}

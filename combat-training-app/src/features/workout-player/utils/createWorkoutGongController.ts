import type { WorkoutGong } from '@/application/audio/workoutGong'
import type { WorkoutPlaybackStep } from '@/domain/workout-playback/workoutPlayback.types'
import type { WorkoutPlaybackEvent } from '@/features/workout-player/types/workoutPlaybackEvents.types'
import { selectWorkoutGongSignal } from '@/features/workout-player/utils/selectWorkoutGongSignal'

export function createWorkoutGongController(steps: readonly WorkoutPlaybackStep[], gong: WorkoutGong) {
  let events: WorkoutPlaybackEvent[] = []
  let scheduled = false
  let generation = 0

  function reset(): void {
    events = []
    scheduled = false
    generation += 1
  }

  return {
    unlock: () => gong.unlock(),
    onPlaybackEvent(event: WorkoutPlaybackEvent) {
      if (event.type === 'restarted') {
        reset()
        return
      }

      events.push(event)
      if (scheduled) {
        return
      }

      scheduled = true
      const scheduledGeneration = generation
      // The timer emits all elapsed steps synchronously. Flush once after that batch.
      queueMicrotask(() => {
        if (generation !== scheduledGeneration) {
          return
        }

        const signal = selectWorkoutGongSignal(events, steps)
        events = []
        scheduled = false
        if (signal !== null) {
          gong.play(signal)
        }
      })
    },
    dispose() {
      reset()
      gong.dispose()
    },
  }
}

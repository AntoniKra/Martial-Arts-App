import type { WorkoutGongSignal } from '@/application/audio/workoutGong'
import type { WorkoutPlaybackStep } from '@/features/workout-player/types/workoutPlayback.types'
import type { WorkoutPlaybackEvent } from '@/features/workout-player/types/workoutPlaybackEvents.types'

export function selectWorkoutGongSignal(
  events: readonly WorkoutPlaybackEvent[],
  steps: readonly WorkoutPlaybackStep[],
): WorkoutGongSignal | null {
  let signal: WorkoutGongSignal | null = null

  for (const event of events) {
    if (event.type === 'completed') {
      signal = 'workoutEnd'
    } else if (event.type === 'started') {
      signal = 'restEnd'
    } else if (event.type === 'restarted') {
      signal = null
    } else if (event.reason !== 'elapsed') {
      signal = null
    } else {
      const nextStep = steps[event.stepIndex + 1]
      // Only the state reached by the last transition matters after catching up.
      signal = nextStep === undefined ? null : nextStep.kind === 'exercise' ? 'restEnd' : 'workEnd'
    }
  }

  return signal
}

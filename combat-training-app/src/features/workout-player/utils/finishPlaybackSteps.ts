import type { WorkoutPlaybackStep } from '@/domain/workout-playback/workoutPlayback.types'
import type { WorkoutPlaybackEvent, WorkoutPlaybackStepFinalizeReason } from '@/features/workout-player/types/workoutPlaybackEvents.types'
import { calculatePerformedDurationSeconds, deriveStepOutcome } from '@/features/workout-player/utils/workoutPlaybackStepOutcome'

export function getNextWorkoutItemStepIndex(steps: readonly WorkoutPlaybackStep[], currentIndex: number): number {
  const current = steps[currentIndex]
  let index = currentIndex + 1
  while (index < steps.length && steps[index].itemId === current.itemId && steps[index].blockId === current.blockId) {
    index += 1
  }
  return index
}

/** Only the current attempt contributes elapsed time; unvisited steps contribute zero. */
export function finalizePlaybackSteps(
  steps: readonly WorkoutPlaybackStep[],
  currentIndex: number,
  targetIndex: number,
  remainingSeconds: number,
  elapsedMs: number,
  reason: WorkoutPlaybackStepFinalizeReason,
): WorkoutPlaybackEvent[] {
  return steps.slice(currentIndex, targetIndex).map((step, offset) => {
    const remaining = offset === 0 ? remainingSeconds : step.durationSeconds
    const performedDurationSeconds = calculatePerformedDurationSeconds(step.durationSeconds, remaining, reason, step.kind)
    return {
      type: 'stepFinalized',
      stepIndex: currentIndex + offset,
      playbackStepId: step.id,
      performedDurationSeconds,
      performedDurationMs: offset === 0 ? elapsedMs : 0,
      outcome: deriveStepOutcome(step.durationSeconds, performedDurationSeconds, reason, step.kind),
      reason,
    }
  })
}

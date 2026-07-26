import type { WorkoutSessionStepOutcome } from '@/domain/workout-session/workoutSession.types'
import type { WorkoutPlaybackStepFinalizeReason } from '@/features/workout-player/types/workoutPlaybackEvents.types'

export function calculatePerformedDurationSeconds(
  plannedDurationSeconds: number,
  remainingSeconds: number,
  reason: WorkoutPlaybackStepFinalizeReason,
): number {
  if (reason === 'elapsed') {
    return plannedDurationSeconds
  }

  const performed = plannedDurationSeconds - remainingSeconds

  return Math.max(0, Math.min(plannedDurationSeconds, performed))
}

export function deriveStepOutcome(
  plannedDurationSeconds: number,
  performedDurationSeconds: number,
  reason: WorkoutPlaybackStepFinalizeReason,
): WorkoutSessionStepOutcome {
  if (reason === 'elapsed') {
    return 'completed'
  }

  if (performedDurationSeconds === 0) {
    return 'skipped'
  }

  if (performedDurationSeconds === plannedDurationSeconds) {
    return 'completed'
  }

  return 'partial'
}

import type { WorkoutSessionStepKind, WorkoutSessionStepOutcome } from '@/domain/workout-session/workoutSession.types'
import type { WorkoutPlaybackStepFinalizeReason } from '@/features/workout-player/types/workoutPlaybackEvents.types'

export function calculatePerformedDurationSeconds(
  plannedDurationSeconds: number,
  remainingSeconds: number,
  reason: WorkoutPlaybackStepFinalizeReason,
  kind: WorkoutSessionStepKind,
): number {
  // Interrupted exercises retain their real elapsed time separately, but earn no work.
  if (kind === 'exercise' && reason !== 'elapsed') return 0

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
  kind: WorkoutSessionStepKind,
): WorkoutSessionStepOutcome {
  if (kind === 'exercise') return reason === 'elapsed' ? 'completed' : 'skipped'

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

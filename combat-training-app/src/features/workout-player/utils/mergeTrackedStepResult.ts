import type { WorkoutSessionStepOutcome } from '@/domain/workout-session/workoutSession.types'

export interface TrackedStepResult {
  stepIndex: number
  playbackStepId: string
  plannedDurationSeconds: number
  performedDurationSeconds: number
  outcome: WorkoutSessionStepOutcome
}

const OUTCOME_RANK: Record<WorkoutSessionStepOutcome, number> = {
  skipped: 0,
  partial: 1,
  completed: 2,
}

export function mergeTrackedStepResult(
  existing: TrackedStepResult | undefined,
  incoming: TrackedStepResult,
): TrackedStepResult {
  if (existing === undefined) {
    return incoming
  }

  const existingRank = OUTCOME_RANK[existing.outcome]
  const incomingRank = OUTCOME_RANK[incoming.outcome]

  if (incomingRank > existingRank) {
    return incoming
  }

  if (incomingRank < existingRank) {
    return existing
  }

  if (incoming.outcome === 'partial') {
    const performedDurationSeconds = Math.max(
      existing.performedDurationSeconds,
      incoming.performedDurationSeconds,
    )

    return {
      ...existing,
      performedDurationSeconds,
    }
  }

  return existing
}

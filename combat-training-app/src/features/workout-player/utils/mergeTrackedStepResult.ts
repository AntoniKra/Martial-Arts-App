import type { WorkoutSessionStepOutcome } from '@/domain/workout-session/workoutSession.types'

import type { TrackedStepResult } from '@/domain/workout-playback/workoutPlayback.types'

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
    return incoming.performedDurationSeconds > existing.performedDurationSeconds ? incoming : existing
  }

  return existing
}

import type { WorkoutPlan } from '@/domain/workout/workout.types'

function getCreatedAtTimestamp(createdAt: string): number {
  const timestamp = Date.parse(createdAt)

  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY
}

export function selectLatestWorkoutPlan(plans: readonly WorkoutPlan[]): WorkoutPlan | null {
  if (plans.length === 0) {
    return null
  }

  let latestIndex = 0

  for (let index = 1; index < plans.length; index += 1) {
    const candidateTimestamp = getCreatedAtTimestamp(plans[index].createdAt)
    const latestTimestamp = getCreatedAtTimestamp(plans[latestIndex].createdAt)

    if (candidateTimestamp > latestTimestamp) {
      latestIndex = index
    }
  }

  return plans[latestIndex]
}

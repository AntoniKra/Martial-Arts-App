import type { WorkoutPlan } from '@/domain/workout/workout.types'
import type { PlanWorkoutSession, WorkoutSession } from './workoutSession.types'

export interface PreviousPlanRun {
  session: PlanWorkoutSession
  planChanged: boolean
}

/** Sessions are ordered by start time, then by ID to resolve simultaneous starts. */
export function findPreviousPlanRun(
  current: WorkoutSession,
  sessions: readonly WorkoutSession[],
  plan?: WorkoutPlan,
): PreviousPlanRun | null {
  if (current.source !== 'plan') return null
  const compare = (left: PlanWorkoutSession, right: PlanWorkoutSession) =>
    Date.parse(left.startedAt) - Date.parse(right.startedAt) || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
  let previous: PlanWorkoutSession | null = null
  for (const session of sessions) {
    if (session.source !== 'plan' || session.id === current.id || session.workoutPlanId !== current.workoutPlanId) continue
    if (compare(session, current) >= 0) continue
    if (!previous || compare(session, previous) > 0) previous = session
  }
  if (!previous) return null
  const layoutChanged = current.stepResults.length !== previous.stepResults.length || current.stepResults.some((step, index) => {
    const previousStep = previous.stepResults[index]
    return step.blockId !== previousStep.blockId || step.workoutItemId !== previousStep.workoutItemId ||
      step.kind !== previousStep.kind || step.roundNumber !== previousStep.roundNumber || step.roundCount !== previousStep.roundCount
  })
  // Timer corrections also change stored target durations, so require a later plan edit.
  const durationChanged = !layoutChanged && plan !== undefined && plan.id === current.workoutPlanId &&
    Date.parse(plan.updatedAt) > Date.parse(previous.completedAt) &&
    current.stepResults.some((step, index) => step.plannedDurationSeconds !== previous.stepResults[index].plannedDurationSeconds)
  return {
    session: previous,
    planChanged: layoutChanged || durationChanged,
  }
}

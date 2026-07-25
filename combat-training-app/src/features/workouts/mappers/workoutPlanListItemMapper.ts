import { calculateWorkoutPlanSummary } from '@/domain/workout/workoutCalculations'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import type { WorkoutPlanListItem } from '@/features/workouts/types/workoutsView.types'

export function mapWorkoutPlanToListItem(plan: WorkoutPlan): WorkoutPlanListItem {
  const summary = calculateWorkoutPlanSummary(plan)

  return {
    id: plan.id,
    name: plan.nameSnapshot,
    disciplineKey: plan.disciplineKey,
    goal: plan.mainGoal,
    exerciseCount: summary.exerciseCount,
    roundCount: summary.plannedRoundCount,
    estimatedMinutes: Math.ceil(summary.estimatedTotalSeconds / 60),
    createdAt: plan.createdAt,
  }
}

export function mapWorkoutPlansToListItems(plans: readonly WorkoutPlan[]): WorkoutPlanListItem[] {
  return [...plans]
    .map(mapWorkoutPlanToListItem)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

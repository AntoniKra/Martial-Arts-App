import { calculateWorkoutPlanSummary } from '@/domain/workout/workoutCalculations'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import type { HomeFeaturedPlan } from '@/features/home/types/homeView.types'

export function mapWorkoutPlanToFeaturedPlan(plan: WorkoutPlan): HomeFeaturedPlan {
  const summary = calculateWorkoutPlanSummary(plan)

  return {
    id: plan.id,
    name: plan.nameSnapshot,
    disciplineKey: plan.disciplineKey,
    goal: plan.mainGoal ?? '',
    blockCount: summary.blockCount,
    exerciseCount: summary.exerciseCount,
    roundCount: summary.plannedRoundCount,
    estimatedMinutes: Math.ceil(summary.estimatedTotalSeconds / 60),
  }
}

import { workoutPlanFixtures } from '@/mocks/workoutFixtures'
import type { WorkoutsViewData } from '@/features/workouts/types/workoutsView.types'

export const workoutsMockData: WorkoutsViewData = {
  plans: workoutPlanFixtures.map((plan) => ({
    id: plan.id,
    name: plan.name,
    disciplineKey: plan.disciplineKey,
    goal: plan.goal,
    exerciseCount: plan.exerciseCount,
    roundCount: plan.roundCount,
    estimatedMinutes: plan.estimatedMinutes,
    createdAt: plan.createdAt,
  })),
}

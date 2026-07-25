import {
  completedSessionFixtures,
  workoutPlanFixtures,
} from '@/mocks/workoutFixtures'
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
  history: completedSessionFixtures.map((session) => ({
    id: session.id,
    name: session.name,
    disciplineKey: session.disciplineKey,
    dateLabelPl: session.dateLabelPl,
    completedAt: session.completedAt,
    durationLabelPl: session.durationLabelPl,
    completedRounds: session.completedRounds,
    plannedRounds: session.plannedRounds,
    exerciseCompletionPercent: session.exerciseCompletionPercent,
    rpe: session.rpe,
    averageRatingLabel: session.averageRatingLabel,
  })),
}

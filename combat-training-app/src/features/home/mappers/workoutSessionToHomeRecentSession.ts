import { calculateWorkoutSessionSummary } from '@/domain/workout-session/workoutSessionCalculations'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import type { HomeRecentSession } from '@/features/home/types/homeView.types'
import {
  formatActiveDurationSecondsPl,
  formatWorkoutSessionDatePl,
} from '@/features/workouts/utils/formatWorkoutSessionLabels'

export function mapWorkoutSessionToHomeRecentSession(session: WorkoutSession): HomeRecentSession {
  const summary = calculateWorkoutSessionSummary(session)

  return {
    id: session.id,
    name: session.workoutPlanNameSnapshot,
    disciplineKey: session.disciplineKey,
    dateLabelPl: formatWorkoutSessionDatePl(session.completedAt),
    durationLabelPl: formatActiveDurationSecondsPl(summary.activeDurationSeconds),
    exerciseCompletionPercent: summary.exerciseCompletionPercent,
    rpe: null,
    averageRatingLabel: null,
  }
}

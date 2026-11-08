import { workoutSessionName, workoutSessionDate } from '@/features/workouts/utils/workoutSessionPresentation'
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
    status: session.status,
    name: workoutSessionName(session),
    disciplineKey: session.disciplineKey,
    dateLabelPl: formatWorkoutSessionDatePl(workoutSessionDate(session)),
    durationLabelPl: formatActiveDurationSecondsPl(summary.activeDurationSeconds),
    completedExercises: summary.completedExerciseCount,
    plannedExercises: summary.plannedExerciseCount,
    completedRounds: summary.plannedRoundCount > 0 ? summary.completedRoundCount : null,
    plannedRounds: summary.plannedRoundCount > 0 ? summary.plannedRoundCount : null,
    exerciseCompletionPercent: summary.exerciseCompletionPercent,
    rpe: null,
    averageRatingLabel: null,
  }
}

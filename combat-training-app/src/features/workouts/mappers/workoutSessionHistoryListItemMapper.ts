import { calculateWorkoutSessionSummary } from '@/domain/workout-session/workoutSessionCalculations'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import type { WorkoutHistoryListItem } from '@/features/workouts/types/workoutsView.types'
import {
  formatActiveDurationSecondsPl,
  formatWorkoutSessionDatePl,
  formatWorkoutSessionTimePl,
} from '@/features/workouts/utils/formatWorkoutSessionLabels'

export function mapWorkoutSessionToHistoryListItem(session: WorkoutSession): WorkoutHistoryListItem {
  const summary = calculateWorkoutSessionSummary(session)
  const plannedExercises = summary.plannedExerciseStepCount
  const completedExercises = summary.completedExerciseStepCount
  const hasRounds = summary.plannedRoundCount > 0

  const exerciseCompletionPercent =
    plannedExercises > 0 ? Math.round((completedExercises / plannedExercises) * 100) : 0

  return {
    id: session.id,
    name: session.workoutPlanNameSnapshot,
    disciplineKey: session.disciplineKey,
    dateLabelPl: formatWorkoutSessionDatePl(session.completedAt),
    timeLabelPl: formatWorkoutSessionTimePl(session.completedAt),
    completedAt: session.completedAt,
    durationLabelPl: formatActiveDurationSecondsPl(summary.activeDurationSeconds),
    completedExercises,
    plannedExercises,
    exerciseCompletionPercent,
    completedRounds: hasRounds ? summary.completedRoundCount : null,
    plannedRounds: hasRounds ? summary.plannedRoundCount : null,
    note: session.note,
  }
}

export function mapWorkoutSessionsToHistoryListItems(
  sessions: readonly WorkoutSession[],
): WorkoutHistoryListItem[] {
  return [...sessions]
    .map(mapWorkoutSessionToHistoryListItem)
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
}

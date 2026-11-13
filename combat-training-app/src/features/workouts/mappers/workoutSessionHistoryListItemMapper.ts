import { workoutSessionName, workoutSessionDate } from '@/features/workouts/utils/workoutSessionPresentation'
import { routes } from '@/app/routes'
import { isRpeFromMemory } from '@/domain/workout-session/rpeRecall'
import { calculateWorkoutSessionSummary } from '@/domain/workout-session/workoutSessionCalculations'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import type { WorkoutHistoryListItem } from '@/features/workouts/types/workoutsView.types'
import {
  formatActiveDurationSecondsPl,
  formatWorkoutSessionDatePl,
  formatWorkoutSessionTimePl,
} from '@/features/workouts/utils/formatWorkoutSessionLabels'

export function mapWorkoutSessionToHistoryListItem(session: WorkoutSession, hasPendingWrites = false): WorkoutHistoryListItem {
  const summary = calculateWorkoutSessionSummary(session)
  const hasRounds = summary.plannedRoundCount > 0

  return {
    editPath: session.source === 'manual' ? routes.editManualWorkout(session.id) : undefined,
    isManual: session.source === 'manual', rpe: session.rpe, rpeFromMemory: isRpeFromMemory(session),
    feedbackPath: session.source !== 'manual' ? routes.workoutFeedback(session.id) : undefined,
    id: session.id,
    status: session.status,
    name: workoutSessionName(session),
    disciplineKey: session.disciplineKey,
    dateLabelPl: formatWorkoutSessionDatePl(workoutSessionDate(session)),
    timeLabelPl: session.source === 'manual' ? '' : formatWorkoutSessionTimePl(session.completedAt),
    completedAt: workoutSessionDate(session),
    durationLabelPl: formatActiveDurationSecondsPl(summary.activeDurationSeconds),
    completedExercises: summary.completedExerciseCount,
    plannedExercises: summary.plannedExerciseCount,
    exerciseCompletionPercent: summary.exerciseCompletionPercent,
    completedRounds: hasRounds ? summary.completedRoundCount : null,
    plannedRounds: hasRounds ? summary.plannedRoundCount : null,
    note: session.note,
    hasPendingWrites,
  }
}

export function mapWorkoutSessionsToHistoryListItems(
  sessions: readonly WorkoutSession[],
  pendingIds: ReadonlySet<string> = new Set(),
): WorkoutHistoryListItem[] {
  return [...sessions]
    .map((session) => mapWorkoutSessionToHistoryListItem(session, pendingIds.has(session.id)))
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
}

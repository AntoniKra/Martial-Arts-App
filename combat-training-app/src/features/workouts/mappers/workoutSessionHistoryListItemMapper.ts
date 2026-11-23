import { workoutSessionName, workoutSessionDate } from '@/features/workouts/utils/workoutSessionPresentation'
import { routes } from '@/app/routes'
import { isRpeFromMemory } from '@/domain/workout-session/rpeRecall'
import { DISCIPLINE_LABELS_PL } from '@/domain/discipline/disciplineLabels'
import { manualPartsLabel } from '@/features/manual-workout/manualWorkoutLabels'
import { categoryLabel } from '@/features/week-plan/weekPlanLabels'
import { calculateWorkoutSessionSummary } from '@/domain/workout-session/workoutSessionCalculations'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import type { WorkoutHistoryListItem } from '@/features/workouts/types/workoutsView.types'
import {
  formatActiveDurationSecondsPl,
  formatWorkoutSessionDatePl,
  formatWorkoutSessionTimePl,
} from '@/features/workouts/utils/formatWorkoutSessionLabels'

export function mapWorkoutSessionToHistoryListItem(
  session: WorkoutSession,
  hasPendingWrites = false,
  deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): WorkoutHistoryListItem {
  const summary = calculateWorkoutSessionSummary(session)
  const hasRounds = summary.plannedRoundCount > 0

  return {
    descriptionPl: `${DISCIPLINE_LABELS_PL[session.disciplineKey]} · ${session.source === 'plan' ? 'plan' : session.source === 'manual' && session.parts ? manualPartsLabel(session.parts).toLocaleLowerCase('pl') : categoryLabel(session.category).toLocaleLowerCase('pl')} · ${Math.ceil(session.durationSeconds / 60)} min${session.rpe === null ? '' : ` · RPE ${session.rpe}`}`,
    sparringRounds: session.sparring.length && session.sparring.every((entry) => entry.rounds !== null)
      ? session.sparring.reduce((total, entry) => total + (entry.rounds ?? 0), 0) : null,
    workoutDate: session.workoutDate,
    editPath: session.source === 'manual' ? routes.editManualWorkout(session.id) : undefined,
    isManual: session.source === 'manual', rpe: session.rpe, rpeFromMemory: isRpeFromMemory(session),
    feedbackPath: session.source !== 'manual' ? routes.workoutFeedback(session.id) : undefined,
    id: session.id,
    status: session.status,
    name: workoutSessionName(session),
    disciplineKey: session.disciplineKey,
    dateLabelPl: formatWorkoutSessionDatePl(session.workoutDate),
    timeLabelPl: session.source === 'manual' ? '' : formatWorkoutSessionTimePl(session.completedAt, session.timezone, deviceTimeZone),
    completedAt: workoutSessionDate(session),
    durationLabelPl: formatActiveDurationSecondsPl(summary.activeDurationSeconds),
    roundsOnly: session.source === 'quickTimer',
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
  const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return [...sessions]
    .map((session) => mapWorkoutSessionToHistoryListItem(session, pendingIds.has(session.id), deviceTimeZone))
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
}

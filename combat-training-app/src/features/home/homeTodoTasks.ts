import { clubWorkoutPrefill } from '@/domain/week-plan/clubWorkoutPrefill'
import type { selectHomeSchedule } from '@/domain/week-plan/homeSchedule'
import type { selectRpeReminder } from '@/domain/workout-session/rpeReminder'
import { homeLabels as labels } from './homeLabels'

type OverdueEntries = ReturnType<typeof selectHomeSchedule>['overdue']

export function selectHomeTodoTasks(overdue: readonly OverdueEntries[number][], reminder: ReturnType<typeof selectRpeReminder>, today: string) {
  const clubs = overdue.flatMap(({ item, weekStart }) => {
    if (item.kind !== 'club') return []
    const prefill = clubWorkoutPrefill(weekStart, item, today)
    return prefill ? [{ kind: 'overdue' as const, item, prefill }] : []
  }).sort((a, b) => a.prefill.workoutDate.localeCompare(b.prefill.workoutDate) || a.item.startTime.localeCompare(b.item.startTime))
  return reminder ? [...clubs, { kind: 'rpe' as const, session: reminder }] : clubs
}

export function homeTodoExpanderLabel(hiddenTasks: ReturnType<typeof selectHomeTodoTasks>) {
  if (hiddenTasks.length !== 1) return labels.remainingTasks
  return hiddenTasks[0].kind === 'rpe' ? labels.rateRpeTask : labels.overdueWorkout
}

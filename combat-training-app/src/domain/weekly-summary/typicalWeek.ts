import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { calculateWeeklySummary } from './weeklySummary'

export interface TypicalWeek {
  workoutCount: number
  durationSeconds: number
  loadUnits: number | null
}

/** Three preceding calendar weeks; empty weeks are rest, missing RPE is unknown load. */
export function calculateTypicalWeek(weekStart: string, sessions: readonly WorkoutSession[]): TypicalWeek | null {
  const firstWeek = shiftCalendarDate(weekStart, -21)
  if (!sessions.some((session) => session.workoutDate <= firstWeek)) return null

  const weeks = Array.from({ length: 3 }, (_, index) =>
    calculateWeeklySummary(shiftCalendarDate(firstWeek, index * 7), sessions))
  return {
    workoutCount: weeks.reduce((sum, week) => sum + week.workoutCount, 0) / 3,
    durationSeconds: weeks.reduce((sum, week) => sum + week.durationSeconds, 0) / 3,
    loadUnits: weeks.every((week) => week.load.knownCount === week.workoutCount)
      ? weeks.reduce((sum, week) => sum + (week.load.units ?? 0), 0) / 3 : null,
  }
}

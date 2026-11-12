import { currentWeekStart, shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { calculateWeeklySummary } from './weeklySummary'

export interface WeeklySeriesPoint {
  weekStart: string
  workoutCount: number
  durationSeconds: number
  isCurrent: boolean
}

/** Twelve calendar weeks ending at the selected week, using the summary's journal rules. */
export function calculateWeeklySeries(
  weekStart: string, sessions: readonly WorkoutSession[], currentWeek = currentWeekStart(),
): WeeklySeriesPoint[] {
  return Array.from({ length: 12 }, (_, index) => {
    const start = shiftCalendarDate(weekStart, (index - 11) * 7)
    const { workoutCount, durationSeconds } = calculateWeeklySummary(start, sessions)
    return { weekStart: start, workoutCount, durationSeconds, isCurrent: start === currentWeek }
  })
}

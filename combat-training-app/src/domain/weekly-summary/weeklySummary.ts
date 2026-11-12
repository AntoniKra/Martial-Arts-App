import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'

export interface RecordedTime {
  seconds: number | null
  knownCount: number
}

export interface WeeklySummary {
  workoutCount: number
  completedCount: number
  partialCount: number
  durationSeconds: number
  work: RecordedTime
  sparring: RecordedTime
  rpeCount: number
}

function sumRecordedTime(sessions: readonly WorkoutSession[], field: 'workSeconds' | 'sparringSeconds'): RecordedTime {
  let seconds = 0
  let knownCount = 0
  for (const session of sessions) {
    const value = session[field]
    if (value !== null) {
      seconds += value
      knownCount++
    }
  }
  return { seconds: knownCount ? seconds : null, knownCount }
}

/** Uses the saved calendar day; goals and timestamps do not affect journal totals. */
export function calculateWeeklySummary(weekStart: string, sessions: readonly WorkoutSession[]): WeeklySummary {
  const weekEnd = shiftCalendarDate(weekStart, 6)
  const selected = sessions.filter((session) => session.workoutDate >= weekStart && session.workoutDate <= weekEnd)
  return {
    workoutCount: selected.length,
    completedCount: selected.filter((session) => session.status === 'completed').length,
    partialCount: selected.filter((session) => session.status === 'partial').length,
    durationSeconds: selected.reduce((total, session) => total + session.durationSeconds, 0),
    work: sumRecordedTime(selected, 'workSeconds'),
    sparring: sumRecordedTime(selected, 'sparringSeconds'),
    rpeCount: selected.filter((session) => session.rpe !== null).length,
  }
}

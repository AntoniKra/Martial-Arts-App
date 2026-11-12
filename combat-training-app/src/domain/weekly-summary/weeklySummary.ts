import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'

export interface RecordedTime {
  seconds: number | null
  knownCount: number
}

/** Session-RPE load in arbitrary units: RPE × training minutes (with rests, without pauses). */
export interface RecordedLoad {
  units: number | null
  durationSeconds: number | null
  knownCount: number
}

export interface WeeklySessionLoad {
  session: WorkoutSession
  load: number | null
}

export interface WeeklySummary {
  workoutCount: number
  completedCount: number
  partialCount: number
  durationSeconds: number
  work: RecordedTime
  sparring: RecordedTime
  rpeCount: number
  load: RecordedLoad
  sessionLoads: WeeklySessionLoad[]
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

export function calculateSessionLoad(session: WorkoutSession): number | null {
  return session.rpe === null ? null : session.rpe * session.durationSeconds / 60
}

function sumRecordedLoad(sessionLoads: readonly WeeklySessionLoad[]): RecordedLoad {
  let units = 0
  let durationSeconds = 0
  let knownCount = 0
  for (const { session, load } of sessionLoads) {
    if (load !== null) {
      units += load
      durationSeconds += session.durationSeconds
      knownCount++
    }
  }
  return knownCount ? { units, durationSeconds, knownCount } : { units: null, durationSeconds: null, knownCount }
}

function newestFirst(left: WorkoutSession, right: WorkoutSession): number {
  return right.workoutDate.localeCompare(left.workoutDate) || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
}

/** Uses the saved calendar day; goals and timestamps do not affect journal totals. */
export function calculateWeeklySummary(weekStart: string, sessions: readonly WorkoutSession[]): WeeklySummary {
  const weekEnd = shiftCalendarDate(weekStart, 6)
  const selected = sessions.filter((session) => session.workoutDate >= weekStart && session.workoutDate <= weekEnd)
  const sessionLoads = [...selected].sort(newestFirst).map((session) => ({ session, load: calculateSessionLoad(session) }))
  return {
    workoutCount: selected.length,
    completedCount: selected.filter((session) => session.status === 'completed').length,
    partialCount: selected.filter((session) => session.status === 'partial').length,
    durationSeconds: selected.reduce((total, session) => total + session.durationSeconds, 0),
    work: sumRecordedTime(selected, 'workSeconds'),
    sparring: sumRecordedTime(selected, 'sparringSeconds'),
    rpeCount: selected.filter((session) => session.rpe !== null).length,
    load: sumRecordedLoad(sessionLoads),
    sessionLoads,
  }
}

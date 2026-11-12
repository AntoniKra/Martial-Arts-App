import { calculateWorkoutDate } from './workoutSessionDefinitions'
import type { WorkoutSession } from './workoutSession.types'

export function calendarDaysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000)
}

export function isRpeFromMemory(session: Pick<WorkoutSession, 'workoutDate' | 'rpeRecordedAt' | 'timezone'>): boolean {
  return session.rpeRecordedAt !== null
    && calendarDaysBetween(session.workoutDate, calculateWorkoutDate(session.rpeRecordedAt, session.timezone)) >= 3
}

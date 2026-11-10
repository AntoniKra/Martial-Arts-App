import { calculateWorkoutDate } from '@/domain/workout-session/workoutSessionDefinitions'

/** Calendar arithmetic in UTC avoids DST and never reinterprets a saved workoutDate. */
export function shiftCalendarDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function weekStartForDate(date: string): string {
  const weekday = new Date(`${date}T12:00:00.000Z`).getUTCDay()
  return shiftCalendarDate(date, -((weekday + 6) % 7))
}

export function currentWeekStart(now = new Date(), timezone = Intl.DateTimeFormat().resolvedOptions().timeZone): string {
  return weekStartForDate(calculateWorkoutDate(now.toISOString(), timezone))
}

export function isMonday(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(Date.parse(`${date}T12:00:00.000Z`))
    && new Date(`${date}T12:00:00.000Z`).toISOString().slice(0, 10) === date
    && new Date(`${date}T12:00:00.000Z`).getUTCDay() === 1
}

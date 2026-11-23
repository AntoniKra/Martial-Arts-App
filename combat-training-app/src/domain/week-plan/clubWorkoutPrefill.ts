import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { ManualWorkoutPart } from '@/domain/workout-session/workoutSession.types'
import type { ScheduledWeekItem } from './weekPlan.types'
import { shiftCalendarDate, WEEK_PLAN_TIME_ZONE } from './weekCalendar'

export interface ClubWorkoutPrefill {
  workoutDate: string; disciplineKey: DisciplineKey; parts: ManualWorkoutPart[]; durationMinutes: string; weekStart: string
}

const offsetFormatter = new Intl.DateTimeFormat('en', { timeZone: WEEK_PLAN_TIME_ZONE, timeZoneName: 'longOffset' })
const dayMs = 86_400_000

function utcOffset(instant: number): number {
  const name = offsetFormatter.formatToParts(instant).find((part) => part.type === 'timeZoneName')?.value
  if (name === 'GMT') return 0
  const offset = /^GMT([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(name ?? '')
  if (!offset) return NaN
  const [, sign, hours, minutes, seconds] = offset
  return (sign === '+' ? 1 : -1) * (Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds ?? 0)) * 1000
}

function clubTimeInstant(date: string, time: string): number | undefined {
  const wallTime = Date.parse(`${date}T${time}:00Z`)
  if (!Number.isFinite(wallTime)) return undefined
  // Check both offsets around a Warsaw transition. A skipped or repeated time has no unique instant.
  const offsets = new Set([utcOffset(wallTime - dayMs), utcOffset(wallTime + dayMs)])
  const instants = [...offsets].filter((offset) => Number.isFinite(offset) && utcOffset(wallTime - offset) === offset)
    .map((offset) => wallTime - offset)
  return instants.length === 1 ? instants[0] : undefined
}

export function clubWorkoutPrefill(weekStart: string, item: ScheduledWeekItem, today: string): ClubWorkoutPrefill | null {
  if (item.kind !== 'club') return null
  const workoutDate = shiftCalendarDate(weekStart, item.day)
  if (workoutDate > today || workoutDate < shiftCalendarDate(today, -7)) return null
  const start = clubTimeInstant(workoutDate, item.startTime), end = clubTimeInstant(workoutDate, item.endTime)
  const duration = start === undefined || end === undefined ? NaN : (end - start) / 60_000
  return { workoutDate, disciplineKey: item.disciplineKey, parts: [...item.parts],
    durationMinutes: Number.isInteger(duration) && duration >= 1 && duration <= 480 ? String(duration) : '', weekStart }
}

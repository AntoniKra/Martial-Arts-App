import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { ManualWorkoutPart } from '@/domain/workout-session/workoutSession.types'
import type { ScheduledWeekItem } from './weekPlan.types'
import { shiftCalendarDate } from './weekCalendar'

export interface ClubWorkoutPrefill {
  workoutDate: string; disciplineKey: DisciplineKey; parts: ManualWorkoutPart[]; durationMinutes: string; weekStart: string
}

export function clubWorkoutPrefill(weekStart: string, item: ScheduledWeekItem, today: string): ClubWorkoutPrefill | null {
  if (item.kind !== 'club') return null
  const workoutDate = shiftCalendarDate(weekStart, item.day)
  if (workoutDate > today || workoutDate < shiftCalendarDate(today, -7)) return null
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
  const duration = minutes(item.endTime) - minutes(item.startTime)
  return { workoutDate, disciplineKey: item.disciplineKey, parts: [...item.parts],
    durationMinutes: duration <= 480 ? String(duration) : '', weekStart }
}

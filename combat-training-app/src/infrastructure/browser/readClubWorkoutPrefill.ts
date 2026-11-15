import * as z from 'zod/mini'
import type { ClubWorkoutPrefill } from '@/domain/week-plan/clubWorkoutPrefill'
import { MANUAL_WORKOUT_PARTS } from '@/domain/workout-session/workoutSession.types'
import { isMonday, shiftCalendarDate } from '@/domain/week-plan/weekCalendar'

const schema = z.strictObject({
  workoutDate: z.iso.date(), disciplineKey: z.enum(['boxing', 'kickboxing', 'muay_thai', 'k1', 'mma_striking']),
  parts: z.array(z.enum(MANUAL_WORKOUT_PARTS)).check(z.maxLength(6), z.refine((parts) => new Set(parts).size === parts.length)),
  durationMinutes: z.union([z.literal(''), z.string().check(z.regex(/^\d+$/), z.refine((value) => Number(value) >= 1 && Number(value) <= 480))]),
  weekStart: z.iso.date().check(z.refine(isMonday)),
}).check(z.refine((value) => value.workoutDate >= value.weekStart && value.workoutDate < shiftCalendarDate(value.weekStart, 7)))

export function readClubWorkoutPrefill(value: unknown, today: string): ClubWorkoutPrefill | undefined {
  const result = schema.safeParse(value)
  if (!result.success || result.data.workoutDate > today || result.data.workoutDate < shiftCalendarDate(today, -7)) return undefined
  return result.data
}

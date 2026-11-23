import { afterEach, expect, it, vi } from 'vitest'
import { calculateWorkoutDate } from '@/domain/workout-session/workoutSessionDefinitions'
import { clubWorkoutPrefill } from './clubWorkoutPrefill'
import type { ScheduledWeekItem } from './weekPlan.types'

const club: ScheduledWeekItem = { id: 'club', kind: 'club', day: 6, disciplineKey: 'boxing',
  startTime: '01:30', endTime: '03:30', parts: ['technique'], clubName: null, omitted: false }

afterEach(() => vi.useRealTimers())

it.each([
  ['2026-03-29', '2026-03-23', '60'],
  ['2026-10-25', '2026-10-19', '180'],
])('prefills actual Warsaw minutes on %s and leaves 02:30 for confirmation', (date, weekStart, minutes) => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(`${date}T10:00:00Z`))
  const today = calculateWorkoutDate(new Date().toISOString(), 'Asia/Tokyo')
  expect(clubWorkoutPrefill(weekStart, club, today)).toMatchObject({ workoutDate: date, durationMinutes: minutes })
  expect(clubWorkoutPrefill(weekStart, { ...club, endTime: '02:30' }, today)?.durationMinutes).toBe('')
  expect(clubWorkoutPrefill(weekStart, { ...club, startTime: '02:30' }, today)?.durationMinutes).toBe('')
})

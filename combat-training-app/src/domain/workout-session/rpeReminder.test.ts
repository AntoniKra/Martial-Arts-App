import { afterEach, expect, it, vi } from 'vitest'
import { workoutSession } from '@/test/workoutSessionBuilders'
import { selectRpeReminder } from './rpeReminder'

afterEach(() => vi.useRealTimers())

it('selects the newest unrated entry within 24 hours, excluding dismissed entries and RPE zero', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-09T12:00:00Z'))
  const entries = [
    workoutSession({ id: 'old', completedAt: '2026-11-08T11:59:59Z' }),
    workoutSession({ id: 'chosen', completedAt: '2026-11-09T10:00:00Z' }),
    workoutSession({ id: 'rated', completedAt: '2026-11-09T11:00:00Z', rpe: 0 }),
    workoutSession({ id: 'dismissed', completedAt: '2026-11-09T11:30:00Z' }),
  ]
  expect(selectRpeReminder(entries, ['dismissed'], Date.now())?.id).toBe('chosen')
  expect(entries.map((entry) => entry.id)).toEqual(['old', 'chosen', 'rated', 'dismissed'])
})

it('includes the 24 hour boundary, expires immediately afterwards, and ignores future entries', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-09T12:00:00Z'))
  const entry = workoutSession({ completedAt: '2026-11-08T12:00:00Z' })
  const future = workoutSession({ id: 'future', completedAt: '2026-11-09T12:00:01Z' })
  expect(selectRpeReminder([entry, future], [], Date.now())).toEqual(entry)
  vi.advanceTimersByTime(1)
  expect(selectRpeReminder([entry], [], Date.now())).toBeNull()
  expect(selectRpeReminder([], [], Date.now())).toBeNull()
})

it('includes quick timers and respects their dismissal and completed RPE', () => {
  const plan = workoutSession({ completedAt: '2026-11-09T10:00:00Z' })
  const quick = { ...plan, source: 'quickTimer' as const, completion: { completed: 3, planned: 3, unit: 'round' as const } }
  const now = Date.parse('2026-11-09T12:00:00Z')
  expect(selectRpeReminder([quick], [], now)).toEqual(quick)
  expect(selectRpeReminder([quick], [quick.id], now)).toBeNull()
  expect(selectRpeReminder([{ ...quick, rpe: 0 }], [], now)).toBeNull()
})

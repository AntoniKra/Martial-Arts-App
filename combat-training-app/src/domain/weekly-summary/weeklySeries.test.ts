import { afterEach, describe, expect, it, vi } from 'vitest'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import type { ManualWorkoutSession, QuickTimerWorkoutSession, WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { workoutSession } from '@/test/workoutSessionBuilders'
import { calculateWeeklySeries } from './weeklySeries'
import { calculateWeeklySummary } from './weeklySummary'

const monday = '2026-12-28'
const entry = (workoutDate: string, id = workoutDate) => workoutSession({ id, workoutDate, durationSeconds: 90.4 })

afterEach(() => vi.useRealTimers())

describe('calculateWeeklySeries', () => {
  it('returns twelve consecutive zero weeks for an empty history', () => {
    const series = calculateWeeklySeries(monday, [], monday)
    expect(series).toHaveLength(12)
    expect(series.map((point) => point.weekStart)).toEqual(Array.from({ length: 12 }, (_, i) => shiftCalendarDate(monday, (i - 11) * 7)))
    expect(series.every(({ workoutCount, durationSeconds }) => workoutCount === 0 && durationSeconds === 0)).toBe(true)
  })

  it('separates Sunday and Monday across the year boundary by workoutDate, ignoring timestamps and timezone', () => {
    const series = calculateWeeklySeries('2027-01-04', [
      { ...entry('2027-01-03'), timezone: 'Pacific/Honolulu' },
      { ...entry('2027-01-04'), timezone: 'Pacific/Kiritimati' },
    ], '2027-01-04')
    expect(series.slice(-2).map(({ workoutCount, durationSeconds }) => [workoutCount, durationSeconds])).toEqual([[1, 90.4], [1, 90.4]])
  })

  it('includes all sources and partial sessions, excluding both sides of the window', () => {
    const manual: ManualWorkoutSession = {
      id: 'manual', source: 'manual', status: 'completed', disciplineKey: 'boxing', category: 'bag', workoutDate: monday,
      timezone: 'Europe/Warsaw', durationSeconds: 60, workSeconds: null, sparringSeconds: null, completion: null,
      note: null, rpe: 0, rpeRecordedAt: '2027-01-04T10:00:00.000Z', focusRatings: [], sparring: [], createdAt: '2027-01-04T10:00:00.000Z', updatedAt: '2027-01-04T10:00:00.000Z',
    }
    const { focusRatings: _manualRatings, ...timedFields } = manual
    const quick: QuickTimerWorkoutSession = {
      ...timedFields, id: 'quick', source: 'quickTimer', status: 'partial', durationSeconds: 60.4,
      workSeconds: 0, sparringSeconds: 0,
      startedAt: manual.createdAt, completedAt: manual.createdAt, stepResults: [],
      completion: { completed: 1, planned: 2, unit: 'round' },
    }
    const first = shiftCalendarDate(monday, -77)
    const sessions: WorkoutSession[] = [entry(monday), quick, manual, entry(first), entry(shiftCalendarDate(first, -1)), entry('2027-01-04')]
    const series = calculateWeeklySeries(monday, sessions, monday)
    expect(series[0].workoutCount).toBe(1)
    expect(series.at(-1)?.workoutCount).toBe(3)
    expect(series.at(-1)?.durationSeconds).toBeCloseTo(210.8, 10)
    expect(series.reduce((sum, point) => sum + point.workoutCount, 0)).toBe(4)
  })

  it('marks the real current week with a controlled clock, even when it is not selected', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-01-04T12:00:00Z'))
    const series = calculateWeeklySeries('2027-01-11', [])
    expect(series.filter((point) => point.isCurrent).map((point) => point.weekStart)).toEqual(['2027-01-04'])
    expect(series.at(-1)?.isCurrent).toBe(false)
    expect(calculateWeeklySeries(monday, []).some((point) => point.isCurrent)).toBe(false)
  })

  it('matches every weekly summary, preserves fractional seconds and does not mutate input', () => {
    const sessions = Array.from({ length: 85 }, (_, i) => Object.freeze({
      ...entry(shiftCalendarDate(monday, i - 80)), status: i % 2 ? 'partial' as const : 'completed' as const,
    }))
    Object.freeze(sessions)
    const original = structuredClone(sessions)
    const series = calculateWeeklySeries(monday, sessions, monday)
    for (const point of series) {
      const summary = calculateWeeklySummary(point.weekStart, sessions)
      expect(point.workoutCount).toBe(summary.workoutCount)
      expect(point.durationSeconds).toBe(summary.durationSeconds)
    }
    expect(sessions).toEqual(original)
    expect(calculateWeeklySeries(monday, [...sessions].reverse(), monday)).toEqual(series)
  })

  it('moves the window with the selected week, keeping the current-week marker independent', () => {
    const sessions = [entry(monday)]
    const current = calculateWeeklySeries(monday, sessions, monday)
    const previous = calculateWeeklySeries(shiftCalendarDate(monday, -7), sessions, monday)
    expect(previous[0].weekStart).toBe(shiftCalendarDate(current[0].weekStart, -7))
    expect(previous.at(-1)?.weekStart).toBe('2026-12-21')
    expect(previous.every(({ workoutCount, isCurrent }) => workoutCount === 0 && !isCurrent)).toBe(true)
  })
})

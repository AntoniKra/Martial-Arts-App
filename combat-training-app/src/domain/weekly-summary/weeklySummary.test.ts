import { describe, expect, it } from 'vitest'
import type { ManualWorkoutSession, QuickTimerWorkoutSession, WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'
import { calculateSessionLoad, calculateWeeklySummary } from './weeklySummary'

const monday = '2026-12-28'
const instant = '2027-01-04T00:30:00.000Z'
const plan = () => workoutSession({ workoutDate: monday, stepResults: [sessionStep()], durationSeconds: 90.4 })
const manual = (overrides: Partial<ManualWorkoutSession> = {}): ManualWorkoutSession => ({
  id: 'manual', source: 'manual', status: 'completed', disciplineKey: 'boxing', category: 'bag',
  workoutDate: '2027-01-03', timezone: 'Pacific/Honolulu', durationSeconds: 30.4,
  workSeconds: null, sparringSeconds: null, completion: null, note: null, rpe: null,
  rpeRecordedAt: null, sparring: [], createdAt: instant, updatedAt: instant, ...overrides,
})
const quick: QuickTimerWorkoutSession = {
  ...manual(), id: 'quick', source: 'quickTimer', status: 'partial', durationSeconds: 60.4,
  startedAt: instant, completedAt: instant, workSeconds: 20, sparringSeconds: 10,
  completion: { completed: 1, planned: 2, unit: 'round' }, stepResults: [sessionStep()], rpe: 0,
}

describe('calculateWeeklySummary', () => {
  it('includes Monday and Sunday across the year, excluding adjacent days regardless of timestamps or timezone', () => {
    const entries = [
      { ...plan(), timezone: 'Pacific/Kiritimati', startedAt: instant, completedAt: instant },
      manual(),
      manual({ id: 'before', workoutDate: '2026-12-27' }),
      manual({ id: 'after', workoutDate: '2027-01-04' }),
    ]
    const summary = calculateWeeklySummary(monday, entries)
    expect(summary.workoutCount).toBe(2)
    expect(summary.durationSeconds).toBeCloseTo(120.8, 10)
  })

  it('counts all three sources, including partial and additional sessions independently of goals', () => {
    const entries: WorkoutSession[] = [plan(), quick, manual(), { ...plan(), id: 'extra', workoutPlanId: 'another-plan', rpe: 7 }]
    const { sessionLoads, ...totals } = calculateWeeklySummary(monday, entries)
    expect(totals).toEqual({
      workoutCount: 4, completedCount: 3, partialCount: 1, durationSeconds: 271.6,
      work: { seconds: 140, knownCount: 3 }, sparring: { seconds: 10, knownCount: 3 }, rpeCount: 2,
      load: { units: 7 * 90.4 / 60, durationSeconds: 60.4 + 90.4, knownCount: 2 },
    })
    expect(sessionLoads.map(({ session, load }) => [session.id, load])).toEqual([
      ['manual', null], ['quick', 0], ['extra', 7 * 90.4 / 60], ['session-1', null],
    ])
  })

  it('sums fractional duration before presentation, without reconstructing work or sparring from duration or steps', () => {
    const summary = calculateWeeklySummary(monday, [
      { ...plan(), durationSeconds: 30.4, workSeconds: 13, sparringSeconds: 4 },
      { ...plan(), id: 'two', durationSeconds: 30.4, workSeconds: 15, sparringSeconds: 6 },
    ])
    expect(summary.durationSeconds).toBe(60.8)
    expect(summary.work).toEqual({ seconds: 28, knownCount: 2 })
    expect(summary.sparring).toEqual({ seconds: 10, knownCount: 2 })
  })

  it('counts zero as known data and tracks work and sparring coverage independently', () => {
    expect(calculateWeeklySummary(monday, [manual({ workSeconds: 0 }), manual({ id: 'two', sparringSeconds: 0 })])).toMatchObject({
      work: { seconds: 0, knownCount: 1 }, sparring: { seconds: 0, knownCount: 1 },
    })
    expect(calculateWeeklySummary(monday, [manual()])).toMatchObject({
      work: { seconds: null, knownCount: 0 }, sparring: { seconds: null, knownCount: 0 },
    })
    expect(calculateWeeklySummary(monday, [manual({ workSeconds: 0, sparringSeconds: 0 })])).toMatchObject({
      work: { seconds: 0, knownCount: 1 }, sparring: { seconds: 0, knownCount: 1 },
    })
  })

  it('includes sessions without RPE in counts and time, with zero and positive RPE counted as responses', () => {
    const entries = [plan(), quick, manual({ rpe: 10 })]
    const summary = calculateWeeklySummary(monday, entries)
    expect(summary).toMatchObject({ workoutCount: 3, rpeCount: 2 })
    expect(summary.durationSeconds).toBeCloseTo(181.2, 10)
  })

  it('returns zero counts for an empty week without inventing recorded data', () => {
    expect(calculateWeeklySummary(monday, [])).toEqual({
      workoutCount: 0, completedCount: 0, partialCount: 0, durationSeconds: 0,
      work: { seconds: null, knownCount: 0 }, sparring: { seconds: null, knownCount: 0 }, rpeCount: 0,
      load: { units: null, durationSeconds: null, knownCount: 0 }, sessionLoads: [],
    })
  })

  it('does not mutate inputs or depend on their order', () => {
    const entries = [quick, plan(), manual()]
    const original = structuredClone(entries)
    entries.forEach(Object.freeze)
    Object.freeze(entries)
    expect(calculateWeeklySummary(monday, entries)).toEqual(calculateWeeklySummary(monday, [...entries].reverse()))
    expect(entries).toEqual(original)
  })
})

describe('weekly training load', () => {
  const timed = (id: string, minutes: number, rpe: number | null) => manual({ id, workoutDate: monday, durationSeconds: minutes * 60, rpe })

  it('sums recorded load for sessions with RPE only, then reaches full coverage when the missing RPE arrives', () => {
    const entries = [timed('a', 60, 5), timed('b', 30, 3), timed('c', 40, null)]
    const partial = calculateWeeklySummary(monday, entries)
    expect(partial).toMatchObject({ workoutCount: 3, durationSeconds: 130 * 60, rpeCount: 2 })
    expect(partial.load).toEqual({ units: 390, durationSeconds: 90 * 60, knownCount: 2 })
    const full = calculateWeeklySummary(monday, [...entries.slice(0, 2), { ...entries[2], rpe: 4, rpeRecordedAt: instant }])
    expect(full.load).toEqual({ units: 550, durationSeconds: 130 * 60, knownCount: 3 })
  })

  it('treats RPE 0 as a known zero load and missing RPE as no data, never as zero', () => {
    expect(calculateSessionLoad(timed('zero', 45, 0))).toBe(0)
    expect(calculateSessionLoad(timed('none', 45, null))).toBeNull()
    expect(calculateWeeklySummary(monday, [timed('zero', 45, 0)]).load).toEqual({ units: 0, durationSeconds: 2700, knownCount: 1 })
    expect(calculateWeeklySummary(monday, [timed('a', 45, null), timed('b', 20, null)]).load).toEqual({ units: null, durationSeconds: null, knownCount: 0 })
  })

  it('multiplies and sums fractional durations without rounding before presentation', () => {
    const summary = calculateWeeklySummary(monday, [manual({ durationSeconds: 30.4, rpe: 7 }), manual({ id: 'two', durationSeconds: 30.4, rpe: 3 })])
    expect(summary.sessionLoads.map(({ load }) => load)).toEqual([7 * 30.4 / 60, 3 * 30.4 / 60])
    expect(summary.load.units).toBeCloseTo(304 / 60, 10)
    expect(summary.load.durationSeconds).toBe(60.8)
  })

  it('uses training time with rests for every source and status, not work or sparring time', () => {
    const entries: WorkoutSession[] = [
      { ...plan(), durationSeconds: 1200, workSeconds: 600, rpe: 5 },
      { ...quick, durationSeconds: 600, workSeconds: 300, sparringSeconds: 300, rpe: 6 },
      manual({ status: 'partial', durationSeconds: 300, workSeconds: 60, rpe: 2 }),
    ]
    expect(calculateWeeklySummary(monday, entries).load).toEqual({ units: 100 + 60 + 10, durationSeconds: 2100, knownCount: 3 })
  })

  it('keeps a late RPE answer in the week of the training across the year boundary', () => {
    const sunday = manual({ durationSeconds: 600, rpe: 6, rpeRecordedAt: '2027-01-04T09:00:00.000Z', updatedAt: '2027-01-04T09:00:00.000Z' })
    expect(calculateWeeklySummary(monday, [sunday]).load.units).toBe(60)
    expect(calculateWeeklySummary('2027-01-04', [sunday]).load).toEqual({ units: null, durationSeconds: null, knownCount: 0 })
    expect(calculateWeeklySummary('2027-01-04', [sunday]).sessionLoads).toEqual([])
  })

  it('lists only the selected week, newest workout date first with ties broken by id', () => {
    const entries = [
      manual({ id: 'b', workoutDate: monday, rpe: 1 }), manual({ id: 'z', workoutDate: '2027-01-03' }),
      manual({ id: 'a', workoutDate: monday }), manual({ id: 'next', workoutDate: '2027-01-04', rpe: 9 }),
      manual({ id: 'prev', workoutDate: '2026-12-27', rpe: 9 }),
    ]
    const summary = calculateWeeklySummary(monday, entries)
    expect(summary.sessionLoads.map(({ session }) => session.id)).toEqual(['z', 'a', 'b'])
    expect(summary.load).toEqual({ units: 30.4 / 60, durationSeconds: 30.4, knownCount: 1 })
  })
})

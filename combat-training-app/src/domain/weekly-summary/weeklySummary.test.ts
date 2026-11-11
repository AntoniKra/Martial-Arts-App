import { describe, expect, it } from 'vitest'
import type { ManualWorkoutSession, QuickTimerWorkoutSession, WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'
import { calculateWeeklySummary } from './weeklySummary'

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
    expect(calculateWeeklySummary(monday, entries)).toEqual({
      workoutCount: 4, completedCount: 3, partialCount: 1, durationSeconds: 271.6,
      work: { seconds: 140, knownCount: 3 }, sparring: { seconds: 10, knownCount: 3 }, rpeCount: 2,
    })
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

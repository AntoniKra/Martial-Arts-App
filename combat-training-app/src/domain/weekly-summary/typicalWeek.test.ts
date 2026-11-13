import { describe, expect, it } from 'vitest'
import type { ManualWorkoutSession, QuickTimerWorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { workoutSession } from '@/test/workoutSessionBuilders'
import { calculateTypicalWeek } from './typicalWeek'

const selected = '2026-11-09'
const entry = (workoutDate: string, durationSeconds = 60, rpe: number | null = 3) =>
  workoutSession({ id: workoutDate, workoutDate, durationSeconds, rpe })

describe('calculateTypicalWeek', () => {
  it('requires history reaching the first Monday, including for an empty journal', () => {
    expect(calculateTypicalWeek(selected, [])).toBeNull()
    expect(calculateTypicalWeek(selected, [entry('2026-10-20'), entry('2026-10-26'), entry('2026-11-02')])).toBeNull()
    expect(calculateTypicalWeek(selected, [entry('2026-11-09')])).toBeNull()
  })

  it('accepts exactly three weeks and preserves fractional averages before formatting', () => {
    expect(calculateTypicalWeek(selected, [entry('2026-10-19', 90.5), entry('2026-10-26', 60),
      entry('2026-11-02', 60), entry('2026-11-08', 60)])).toEqual({
      workoutCount: 4 / 3, durationSeconds: 270.5 / 3, loadUnits: 13.525 / 3,
    })
  })

  it('counts a whole empty week as zero, with no loss of load completeness', () => {
    expect(calculateTypicalWeek(selected, [entry('2026-10-19', 3600, 5), entry('2026-11-02', 1800, 4)])).toEqual({
      workoutCount: 2 / 3, durationSeconds: 1800, loadUnits: 140,
    })
    expect(calculateTypicalWeek(selected, [entry('2026-10-18', 60, null)])).toEqual({
      workoutCount: 0, durationSeconds: 0, loadUnits: 0,
    })
  })

  it.each(['2026-10-19', '2026-10-26', '2026-11-02'])('withholds only load when RPE is missing in the week of %s', (date) => {
    const sessions = [entry('2026-10-18'), entry(date, 120, null), entry('2026-11-09', 60, null)]
    expect(calculateTypicalWeek(selected, sessions)).toEqual({ workoutCount: 1 / 3, durationSeconds: 40, loadUnits: null })
  })

  it('treats RPE zero as complete and ignores missing RPE outside the window', () => {
    expect(calculateTypicalWeek(selected, [entry('2026-10-18', 60, null), entry('2026-10-19', 60, 0),
      entry('2026-11-09', 60, null)])?.loadUnits).toBe(0)
  })

  it('uses saved dates across year boundaries, all sources and both statuses', () => {
    const manual: ManualWorkoutSession = {
      id: 'manual', source: 'manual', status: 'completed', disciplineKey: 'boxing', category: 'bag',
      workoutDate: '2026-12-14', timezone: 'Pacific/Honolulu', durationSeconds: 120, workSeconds: null,
      sparringSeconds: null, completion: null, note: null, rpe: 6, rpeRecordedAt: '2027-01-04T10:00:00.000Z',
      focusRatings: [], sparring: [], createdAt: '2027-01-04T10:00:00.000Z', updatedAt: '2027-01-04T10:00:00.000Z',
    }
    const quick: QuickTimerWorkoutSession = {
      id: 'quick', source: 'quickTimer', status: 'partial', disciplineKey: 'boxing', category: 'bag',
      workoutDate: '2027-01-03', timezone: 'Pacific/Kiritimati', durationSeconds: 180, workSeconds: 0,
      sparringSeconds: 0, completion: { completed: 1, planned: 2, unit: 'round' }, note: null, rpe: 4,
      rpeRecordedAt: manual.createdAt, sparring: [], createdAt: manual.createdAt, updatedAt: manual.createdAt,
      startedAt: manual.createdAt, completedAt: manual.createdAt, stepResults: [],
    }
    const sessions = Object.freeze([manual, quick, Object.freeze(entry('2026-12-21', 60, 3)),
      Object.freeze(entry('2026-12-13', 999, null)), Object.freeze(entry('2027-01-04', 999, null))])
    const original = structuredClone(sessions)
    expect(calculateTypicalWeek('2027-01-04', sessions)).toEqual({ workoutCount: 1, durationSeconds: 120, loadUnits: 9 })
    expect(calculateTypicalWeek('2027-01-04', [...sessions].reverse())).toEqual(calculateTypicalWeek('2027-01-04', sessions))
    expect(sessions).toEqual(original)
  })

  it('anchors the window to the selected week, for current and past weeks', () => {
    const sessions = [entry('2026-10-12', 600), entry('2026-10-19', 120), entry('2026-10-26', 180),
      entry('2026-11-02', 240), entry('2026-11-09', 999)]
    expect(calculateTypicalWeek('2026-11-09', sessions)?.durationSeconds).toBe(180)
    expect(calculateTypicalWeek('2026-11-02', sessions)?.durationSeconds).toBe(300)
  })
})

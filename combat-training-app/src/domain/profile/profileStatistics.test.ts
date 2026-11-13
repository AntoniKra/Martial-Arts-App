import { describe, expect, it } from 'vitest'
import { workoutSession } from '@/test/workoutSessionBuilders'
import type { ManualWorkoutSession, QuickTimerWorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { calculateProfileStatistics } from './profileStatistics'

const today = '2027-01-03'
const base = workoutSession({ workoutDate: '2026-12-07', category: 'bag', durationSeconds: 90.4,
  sparring: [{ blockId: 'one', intensity: 'hard', rounds: 3 }] })
const manual: ManualWorkoutSession = { id: 'manual', source: 'manual', status: 'completed', disciplineKey: 'boxing',
  category: 'sparring', workoutDate: today, timezone: 'Pacific/Honolulu', durationSeconds: 1800,
  workSeconds: null, sparringSeconds: null, completion: null, note: null, rpe: 5, rpeRecordedAt: base.createdAt,
  focusRatings: [], sparring: [{ blockId: null, intensity: 'technical', rounds: null }], createdAt: base.createdAt, updatedAt: base.updatedAt }
const { workoutPlanId: _plan, workoutPlanNameSnapshot: _name, focusRatings: _ratings, exerciseRatings: _exercise, ...timed } = base
const quick: QuickTimerWorkoutSession = { ...timed, id: 'quick', source: 'quickTimer', status: 'partial',
  workoutDate: '2026-12-06', category: 'bag', durationSeconds: 60.4, completion: { completed: 1, planned: 2, unit: 'round' } }

describe('profile journal statistics', () => {
  it('includes all sources and statuses, uses saved dates, sums known rounds and counts workouts with unknown rounds', () => {
    const summary = calculateProfileStatistics([base, manual, quick, { ...manual, id: 'unknown-two' }], today)
    expect(summary).toMatchObject({ firstDate: '2026-12-06', workoutCount: 4,
      durationSeconds: 3750.8, sparringRounds: 6, unknownRoundWorkouts: 2,
      start: '2026-12-07', end: today, recentDurationSeconds: 3690.4,
      categories: [{ category: 'sparring', durationSeconds: 3600 }, { category: 'bag', durationSeconds: 90.4 }] })
  })
  it('excludes adjacent days from the 28-day interval and sorts categories by total duration', () => {
    const result = calculateProfileStatistics([base, quick, manual,
      { ...base, id: 'future', workoutDate: '2027-01-04', category: 'technique', durationSeconds: 9000 }], today)
    expect(result.categories).toEqual([{ category: 'sparring', durationSeconds: 1800 }, { category: 'bag', durationSeconds: 90.4 }])
  })
  it('does not replace unknown rounds with zero and distinguishes no sparring from unknown sparring', () => {
    expect(calculateProfileStatistics([manual], today)).toMatchObject({ sparringRounds: null, unknownRoundWorkouts: 1 })
    expect(calculateProfileStatistics([{ ...base, sparring: [] }], today)).toMatchObject({ sparringRounds: 0, unknownRoundWorkouts: 0 })
    expect(calculateProfileStatistics([], today)).toMatchObject({ firstDate: null, workoutCount: 0, categories: [] })
  })
})

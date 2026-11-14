import { describe, expect, it } from 'vitest'
import type { QuickTimerWorkoutSession } from './workoutSession.types'
import { workoutSession } from '@/test/workoutSessionBuilders'
import { manualWorkoutSession } from '@/test/manualWorkoutBuilder'
import { workoutPlan } from '@/test/workoutBuilders'
import { findPreviousPlanRun } from './previousPlanRun'

const current = workoutSession({ id: 'current', startedAt: '2026-11-13T10:00:00.000Z', completedAt: '2026-11-13T11:00:00.000Z' })
const older = workoutSession({ id: 'older', startedAt: '2026-11-06T10:00:00.000Z', completedAt: '2026-11-06T11:00:00.000Z' })
const { workoutPlanId: _planId, workoutPlanNameSnapshot: _name, focusRatings: _focus, exerciseRatings: _ratings, ...timed } = older
const quick: QuickTimerWorkoutSession = { ...timed, id: 'quick', source: 'quickTimer', completion: { completed: 1, planned: 1, unit: 'round' } }

describe('previous execution of the same plan', () => {
  it('selects the newest earlier start regardless of completion time, array order, or partial status', () => {
    const latest = { ...older, id: 'latest', status: 'partial' as const, startedAt: '2026-11-13T09:00:00.000Z', completedAt: '2026-11-13T09:15:00.000Z' }
    const entries = [current, latest, { ...older, completedAt: current.completedAt },
      workoutSession({ id: 'other-plan', workoutPlanId: 'other', startedAt: '2026-11-13T09:30:00.000Z' }),
      manualWorkoutSession(), quick, { ...current, id: 'future', startedAt: '2026-11-13T11:00:00.000Z' }]
    for (const sessions of [entries, [...entries].reverse()]) expect(findPreviousPlanRun(current, sessions)?.session).toBe(latest)
    expect(entries[0]).toBe(current)
  })

  it('orders starts on the same day by time, and equal instants by ID', () => {
    const earlier = { ...current, id: 'z-earlier', startedAt: '2026-11-13T09:59:59.000Z' }
    const firstTie = { ...current, id: 'a' }, lastTie = { ...current, id: 'b' }, laterTie = { ...current, id: 'z' }
    expect(findPreviousPlanRun(current, [laterTie, earlier, current])?.session).toBe(earlier)
    expect(findPreviousPlanRun(current, [firstTie, laterTie, earlier, lastTie, current])?.session).toBe(lastTie)
    expect(findPreviousPlanRun(firstTie, [lastTie, current, firstTie])).toBeNull()
  })

  it('excludes self by ID even when the same session has a different start in the collection', () => {
    expect(findPreviousPlanRun(current, [{ ...older, id: current.id }])).toBeNull()
  })

  it('returns no comparison without an earlier run or for other sources', () => {
    expect(findPreviousPlanRun(current, [])).toBeNull()
    expect(findPreviousPlanRun(current, [current, quick, manualWorkoutSession()])).toBeNull()
    expect(findPreviousPlanRun(quick, [older])).toBeNull()
    expect(findPreviousPlanRun(manualWorkoutSession(), [older])).toBeNull()
  })

  it.each([
    ['2026-11-06T10:59:59.999Z', false],
    [older.completedAt, false],
    ['2026-11-06T11:00:00.001Z', true],
  ])('marks plan edits at %s as changed: %s', (updatedAt, planChanged) => {
    expect(findPreviousPlanRun(current, [older], { ...workoutPlan([]), updatedAt })).toEqual({ session: older, planChanged })
  })

  it('compares deleted plans without the changed-plan notice and ignores another plan', () => {
    expect(findPreviousPlanRun(current, [older])).toEqual({ session: older, planChanged: false })
    expect(findPreviousPlanRun(current, [older], { ...workoutPlan([]), id: 'other', updatedAt: current.completedAt })?.planChanged).toBe(false)
  })
})

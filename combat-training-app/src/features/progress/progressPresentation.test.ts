import { describe, expect, it } from 'vitest'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import { manualWorkoutSession } from '@/test/manualWorkoutBuilder'
import { formatSparringRounds, latestOpenCorrection, weekSummaryTile } from './progressPresentation'

const instant = '2026-11-18T12:00:00.000Z'

function skill(id: string, workoutDate: string, overrides: Partial<FocusSkill> = {}): FocusSkill {
  return { id, name: id, criterion: 'Hand returns to guard', archivedAt: null, createdAt: instant, updatedAt: instant,
    openCorrection: { workoutDate, sessionId: id, problem: 'Dropped hand', fix: 'Touch chin' }, ...overrides }
}

describe('week summary tile', () => {
  it('uses credited sessions and their target for a scheduled goal', () => {
    expect(weekSummaryTile(4, 2, { goalCount: 1, targetCount: 3 })).toEqual({ count: 1, target: 3 })
  })

  it('uses the workout count and legacy target without a scheduled goal', () => {
    expect(weekSummaryTile(4, 3, { goalCount: 1, targetCount: 0 })).toEqual({ count: 4, target: 3 })
    expect(weekSummaryTile(4, 3, null)).toEqual({ count: 4, target: 3 })
  })

  it('preserves the workout count when there is no target', () => {
    expect(weekSummaryTile(4, null, null)).toEqual({ count: 4, target: null })
  })
})

describe('latest open correction', () => {
  it('uses the newest workout date among active skills with an open correction', () => {
    const newest = skill('newest', '2026-11-17')
    const archived = skill('archived', '2026-11-18', { archivedAt: instant })
    const resolved = skill('resolved', '2026-11-18', { openCorrection: null })
    expect(latestOpenCorrection([archived, newest, resolved, skill('older', '2026-11-16')], []))
      .toMatchObject({ skillId: newest.id, correction: newest.openCorrection })
    expect(latestOpenCorrection([archived, resolved], [])).toBeNull()
  })

  it('uses session creation time for corrections from workouts on the same day', () => {
    const date = '2026-11-17'
    const early = manualWorkoutSession({ id: 'early', workoutDate: date, createdAt: `${date}T08:00:00Z` })
    const late = manualWorkoutSession({ id: 'late', workoutDate: date, createdAt: `${date}T14:00:00Z` })
    expect(latestOpenCorrection([skill('early', date), skill('late', date)], [late, early]))
      .toMatchObject({ skillId: 'late', session: late })
  })
})

describe('sparring rounds label', () => {
  it('shows a plain count, a lower bound, or an unknown count', () => {
    expect(formatSparringRounds(12, 0)).toBe('12')
    expect(formatSparringRounds(12, 1)).toBe('≥ 12')
    expect(formatSparringRounds(0, 1)).toBe('?')
    expect(formatSparringRounds(0, 0)).toBe('0')
  })
})

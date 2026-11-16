import { expect, it } from 'vitest'
import { workoutSession } from '@/test/workoutSessionBuilders'
import type { FocusSkillAssessment } from '@/domain/focus-skill/focusSkillProgress'
import { focusCardSummary, latestCorrection, progressWeeks, sparringOverview, typicalProgress, weekTarget } from '@/domain/weekly-summary/progressOverview'

const entry = (workoutDate: string, minutes = 60, rpe: number | null = 5) => workoutSession({ id: workoutDate, workoutDate, durationSeconds: minutes * 60, rpe })
const current = '2026-11-16'

it('requires four full weeks and computes a median, including empty weeks and excluding the running week', () => {
  expect(typicalProgress([], current)).toBeNull()
  expect(typicalProgress([entry('2026-10-20')], current)).toBeNull()
  const sessions = [entry('2026-10-19', 10), entry('2026-10-26', 30), entry('2026-11-02', 100), entry(current, 900)]
  expect(typicalProgress(sessions, current)).toEqual({ minutes: 20, load: 100 })
  expect(typicalProgress([...sessions, entry('2026-11-09', 20, null)], current)).toEqual({ minutes: 25, load: null })
  expect(typicalProgress([entry('2026-10-19', 10, 0)], current)).toEqual({ minutes: 0, load: 0 })
})

it('starts at the first saved workout week, fills interior gaps and caps at twelve weeks', () => {
  expect(progressWeeks([], current)).toEqual([])
  expect(progressWeeks([entry('2026-11-04')], current)).toEqual(['2026-11-02', '2026-11-09', current])
  expect(progressWeeks([entry('2025-01-01')], current)).toHaveLength(12)
  expect(progressWeeks([entry('2027-01-01')], current)).toEqual([])
})

it('uses v2 targetCount or the legacy goal count and omits an unset goal', () => {
  const plan = { weekStart: current, items: [], createdAt: '', updatedAt: '', editedAfterWeekEnd: false }
  expect(weekTarget(undefined)).toBeNull()
  expect(weekTarget(plan)).toBeNull()
  expect(weekTarget({ ...plan, schedule: [], targetCount: 4 })).toBe(4)
})

it('describes the last two numeric assessments for the current criterion without counting unratable entries', () => {
  const assessment = (value: number | 'unableToRate', currentCriterion = true): FocusSkillAssessment => ({
    assessment: value, currentCriterion, focusSkillId: 'guard', skillNameSnapshot: 'Guard', criterionSnapshot: 'Chin', workoutItemId: 'one',
    blockType: 'bag', sessionId: 'one', workoutDate: current, planName: 'Bag', correction: null, previousCorrectionCheck: null,
  })
  expect(focusCardSummary([])).toEqual({ value: null, recent: [], trend: null })
  expect(focusCardSummary([assessment(3)])).toEqual({ value: 3, recent: [3], trend: null })
  expect(focusCardSummary([assessment(3), assessment(4), assessment('unableToRate')]).trend).toBe('↑ z 3')
  expect(focusCardSummary([assessment(3), assessment(3)]).trend).toBe('bez zmian')
  expect(focusCardSummary([assessment(4), assessment(3), assessment(5, false)]).trend).toBe('↓ z 4')
})

it('keeps missing sparring rounds distinct from zero and selects corrections from saved history', () => {
  const session = { ...entry(current), sparring: [{ blockId: null, intensity: null, rounds: null }] }
  expect(sparringOverview([session], current, current)).toEqual({ rounds: 0, workouts: 1, unknown: 1 })
  expect(latestCorrection([session])).toBeNull()
  const rating = { workoutItemId: 'one', focusSkillId: 'guard', skillNameSnapshot: 'Guard', criterionSnapshot: 'Chin', blockType: 'bag' as const,
    assessment: 3, correction: { problem: 'Low hand', fix: 'Chin' }, previousCorrectionCheck: null }
  expect(latestCorrection([{ ...session, focusRatings: [rating] }])).toMatchObject({ problem: 'Low hand', fix: 'Chin', workoutDate: current })
})

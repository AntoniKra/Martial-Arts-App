import { describe, expect, it } from 'vitest'
import type { FocusSkill } from './focusSkill.types'
import type { FocusRating } from '@/domain/workout-session/workoutSession.types'
import { block, continuousExercise, workoutBreak, workoutPlan } from '@/test/workoutBuilders'
import { workoutSession } from '@/test/workoutSessionBuilders'
import { detachFocusSkill, hasFocusSkillEntries, median, selectFocusSkillAssessments, selectFocusSkillChart, selectFocusSkillPlans, summarizeFocusSkill } from './focusSkillProgress'

const instant = '2026-11-01T10:00:00.000Z'
const skill: FocusSkill = { id: 'guard', name: 'Guard', criterion: 'Chin', openCorrection: null, archivedAt: null, createdAt: instant, updatedAt: instant }
const rating = (assessment: FocusRating['assessment'], changes: Partial<FocusRating> = {}): FocusRating => ({
  workoutItemId: 'one', focusSkillId: skill.id, skillNameSnapshot: skill.name, criterionSnapshot: skill.criterion,
  blockType: 'bag', assessment, correction: null, previousCorrectionCheck: null, ...changes,
})
const assessments = (values: FocusRating['assessment'][]) => selectFocusSkillAssessments(skill, values.map((value, index) =>
  workoutSession({ id: `session-${index}`, workoutDate: `2026-11-${String(index + 1).padStart(2, '0')}`, focusRatings: [rating(value)] })))

describe('focus skill progress', () => {
  it.each([
    [[], null, [], []], [[3], 3, [3], []], [[2, 3], 2.5, [2, 3], []],
    [[2, 4, 3], 3, [2, 4, 3], []], [[2, 3, 4, 5], 3.5, [3, 4, 5], [2]],
    [[1, 2, 2, 3, 4, 3, 4], 3, [4, 3, 4], [2, 2, 3]],
  ] as const)('summarizes %j without mutating values', (values, middle, recent, earlier) => {
    const result = summarizeFocusSkill(assessments([...values]))
    expect(result.count).toBe(values.length)
    expect(result.places[0]?.median ?? null).toBe(middle)
    expect(result.places[0]?.recent ?? []).toEqual(recent)
    expect(result.places[0]?.earlier ?? []).toEqual(earlier)
    expect(median(values)).toBe(middle)
  })

  it('omits null, keeps unable-to-rate outside calculations, separates criteria and places and orders by date', () => {
    const entries = [
      workoutSession({ id: 'latest', workoutDate: '2026-11-10', focusRatings: [rating(4), rating(2, { blockType: 'pads', workoutItemId: 'two' })] }),
      workoutSession({ id: 'old', workoutDate: '2026-11-01', focusRatings: [rating(1, { criterionSnapshot: 'Old' }), rating(null)] }),
      workoutSession({ id: 'middle', workoutDate: '2026-11-05', focusRatings: [rating('unableToRate')] }),
    ]
    const selected = selectFocusSkillAssessments(skill, entries)
    expect(selected.map((entry) => entry.sessionId)).toEqual(['old', 'middle', 'latest', 'latest'])
    const summary = summarizeFocusSkill(selected)
    expect(summary).toMatchObject({ count: 2, unableToRateCount: 1, previousCriterionCount: 1,
      places: [{ blockType: 'bag', median: 4 }, { blockType: 'pads', median: 2 }] })
    expect(selectFocusSkillChart(selected, 20, '2026-11-10')).toMatchObject({ limited: false, criterionChangedAt: '2026-11-05' })
    expect(selectFocusSkillChart(selected, 20, '2026-11-10').points.map((entry) => entry.assessment)).toEqual([1, 4, 2])
    expect(entries.map((entry) => entry.id)).toEqual(['latest', 'old', 'middle'])
  })

  it('limits crowded charts to twelve weeks but preserves the full assessment list', () => {
    const selected = selectFocusSkillAssessments(skill, [
      workoutSession({ workoutDate: '2026-01-01', focusRatings: [rating(1)] }),
      workoutSession({ id: 'new', workoutDate: '2026-11-10', focusRatings: [rating(4)] }),
    ])
    expect(selectFocusSkillChart(selected, 1, '2026-11-10')).toMatchObject({ limited: true, points: [{ assessment: 4 }] })
    expect(selected).toHaveLength(2)
  })

  it('finds affected plans and detaches every occurrence without removing exercises or changing other skills', () => {
    const exercise = { ...continuousExercise('one', 60), focusSkillId: skill.id }
    const plan = workoutPlan([block('bag', [exercise, workoutBreak('rest', 10), { ...exercise, id: 'two' },
      { ...exercise, id: 'other', focusSkillId: 'other' }])])
    const unaffected = { ...workoutPlan([]), id: 'empty' }
    expect(selectFocusSkillPlans(skill.id, [plan, unaffected])).toEqual([plan])
    const detached = detachFocusSkill(plan, skill.id, '2026-11-10T09:00:00.000Z')
    expect(detached.blocks[0].items).toEqual([{ ...exercise, focusSkillId: null }, workoutBreak('rest', 10),
      { ...exercise, id: 'two', focusSkillId: null }, { ...exercise, id: 'other', focusSkillId: 'other' }])
    expect(detached.updatedAt).toBe('2026-11-10T09:00:00.000Z')
    expect(plan.blocks[0].items[0]).toEqual(exercise)
  })

  it('forbids deletion even for an unrated focusRatings entry', () => {
    expect(hasFocusSkillEntries(skill.id, [workoutSession({ focusRatings: [rating(null)] })])).toBe(true)
    expect(hasFocusSkillEntries(skill.id, [workoutSession({ focusRatings: [] })])).toBe(false)
  })
})

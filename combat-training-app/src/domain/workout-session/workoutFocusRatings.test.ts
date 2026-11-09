import { describe, expect, it } from 'vitest'
import { createPlanWorkoutSession } from './workoutSessionDefinitions'
import { createWorkoutFocusRatings } from './workoutFocusRatings'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import { block, continuousExercise } from '@/test/workoutBuilders'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'

const skill: FocusSkill = {
  id: 'guard', name: 'Guard return', criterion: 'Hand touches chin', openCorrection: null,
  archivedAt: null, createdAt: '2026-11-01T10:00:00.000Z', updatedAt: '2026-11-01T10:00:00.000Z',
}

describe('focus ratings in a plan session', () => {
  it('skips missing focus skills and preserves ratings for available occurrences', () => {
    const blocks = [block('bag', [
      { ...continuousExercise('missing', 60), focusSkillId: 'missing' },
      { ...continuousExercise('available', 60), focusSkillId: skill.id },
      continuousExercise('unfocused', 60),
    ], 'bag')]
    expect(createWorkoutFocusRatings(blocks, [])).toEqual([])
    expect(createWorkoutFocusRatings(blocks, [skill])).toMatchObject([
      { workoutItemId: 'available', focusSkillId: skill.id, assessment: null },
    ])
  })
  it('snapshots every focus occurrence in plan order, including skipped exercises', () => {
    const blocks = [
      block('bag', [{ ...continuousExercise('first', 60), focusSkillId: 'guard' }], 'bag'),
      block('pads', [{ ...continuousExercise('second', 60), focusSkillId: 'guard' }], 'pads'),
    ]
    const result = createPlanWorkoutSession(workoutSession({ stepResults: [
      sessionStep({ workoutItemId: 'first', blockType: 'bag' }),
      sessionStep({ playbackStepId: 'second', workoutItemId: 'second', blockType: 'pads', outcome: 'skipped', performedDurationSeconds: 0 }),
    ] }), {
      timezone: 'Europe/Warsaw', blockTypes: ['bag', 'pads'], blocks, focusSkills: [skill],
      endedEarly: true, durations: { durationSeconds: 65, workSeconds: 60, sparringSeconds: 0 },
    })
    skill.name = 'Changed later'
    skill.criterion = 'Changed criterion'
    expect(result).toMatchObject({ kind: 'save', session: { focusRatings: [
      { workoutItemId: 'first', focusSkillId: 'guard', skillNameSnapshot: 'Guard return', criterionSnapshot: 'Hand touches chin', blockType: 'bag', assessment: null, correction: null, previousCorrectionCheck: null },
      { workoutItemId: 'second', focusSkillId: 'guard', skillNameSnapshot: 'Guard return', criterionSnapshot: 'Hand touches chin', blockType: 'pads', assessment: null, correction: null, previousCorrectionCheck: null },
    ] } })
  })
})

import { describe, expect, it } from 'vitest'
import { validateWorkoutPlanDraft } from './workoutValidation'
import { finalizeWorkoutPlan } from './finalizeWorkoutPlan'
import { block, continuousExercise, workoutBreak, workoutPlan } from '@/test/workoutBuilders'

function focusedExercise(id: string, focusSkillId = 'guard') {
  return { ...continuousExercise(id, 60), focusSkillId }
}

describe('workout plan focus skills', () => {
  it('validates and saves an existing archived skill reference', () => {
    const draft = workoutPlan([block('bag', [focusedExercise('one')], 'bag')])
    const archived = { id: 'guard', archivedAt: '2026-11-10T10:00:00.000Z' }
    expect(validateWorkoutPlanDraft(draft, [archived])).toEqual({ isValid: true, issues: [] })
    expect(finalizeWorkoutPlan(draft, [archived])).toMatchObject({ ok: true, plan: { blocks: draft.blocks } })
  })
  it('rejects a fourth focus exercise across blocks, even when all use the same skill', () => {
    const draft = workoutPlan([
      block('bag', [focusedExercise('one'), focusedExercise('two')], 'bag'),
      block('pads', [focusedExercise('three'), focusedExercise('four')], 'pads'),
    ])
    const result = validateWorkoutPlanDraft(draft, [{ id: 'guard' }])
    expect(result.issues.map((issue) => issue.code)).toEqual(['too_many_focus_exercises'])
    expect(result.isValid).toBe(false)
  })

  it('locates a missing skill and prevents saving the plan', () => {
    const draft = workoutPlan([block('bag', [focusedExercise('one', 'missing')], 'bag')])
    expect(validateWorkoutPlanDraft(draft, [{ id: 'guard' }])).toMatchObject({
      isValid: false, issues: [{ code: 'unknown_focus_skill', blockId: 'bag', itemId: 'one' }],
    })
    expect(finalizeWorkoutPlan(draft, [{ id: 'guard' }]).ok).toBe(false)
  })

  it('allows three occurrences, including a repeated skill, and ignores breaks and unmarked exercises', () => {
    const draft = workoutPlan([
      block('bag', [focusedExercise('one'), workoutBreak('rest', 30), focusedExercise('two')], 'bag'),
      block('pads', [focusedExercise('three', 'footwork'), continuousExercise('four', 60)], 'pads'),
    ])
    const skills = [{ id: 'guard' }, { id: 'footwork' }]
    expect(validateWorkoutPlanDraft(draft, skills)).toEqual({ isValid: true, issues: [] })
    expect(finalizeWorkoutPlan(draft, skills)).toMatchObject({ ok: true, plan: { blocks: draft.blocks } })
  })

  it('validates unmarked plans without requiring any focus skills', () => {
    expect(validateWorkoutPlanDraft(workoutPlan([block('one', [continuousExercise('one', 60)])])).isValid).toBe(true)
  })
})

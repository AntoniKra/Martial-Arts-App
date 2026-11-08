import { describe, expect, it } from 'vitest'
import { workoutBuilderReducer } from './workoutBuilder.reducer'
import { workoutPlanToBuilderState } from './workoutPlanToBuilderState'
import { block, continuousExercise, workoutBreak, workoutPlan } from '@/test/workoutBuilders'

describe('builder focus skill selection', () => {
  const plan = workoutPlan([block('bag', [
    { ...continuousExercise('one', 60), focusSkillId: 'guard' },
    { ...continuousExercise('two', 60), focusSkillId: 'guard' },
    { ...continuousExercise('three', 60), focusSkillId: 'footwork' },
    continuousExercise('four', 60), workoutBreak('rest', 30),
  ], 'bag')])
  const action = { type: 'setExerciseFocusSkill', blockId: 'bag', exerciseId: 'four', focusSkillId: 'guard' } as const

  it('blocks a fourth mark and allows it after detaching an existing mark', () => {
    const state = workoutPlanToBuilderState(plan)
    expect(workoutBuilderReducer(state, action)).toBe(state)
    const detached = workoutBuilderReducer(state, { ...action, exerciseId: 'one', focusSkillId: null })
    const selected = workoutBuilderReducer(detached, action)
    expect(selected.draft.blocks[0].items[3]).toMatchObject({ focusSkillId: 'guard' })
    expect(selected.isDirty).toBe(true)
    expect(state.draft.blocks[0].items[0]).toMatchObject({ focusSkillId: 'guard' })
    expect(state.draft.blocks[0].items[3]).toMatchObject({ focusSkillId: null })
  })

  it('allows changing a selected skill at the limit without changing exercise configuration', () => {
    const state = workoutPlanToBuilderState(plan)
    const selected = workoutBuilderReducer(state, { ...action, exerciseId: 'one', focusSkillId: 'footwork' })
    expect(selected.draft.blocks[0].items[0]).toEqual({ ...plan.blocks[0].items[0], focusSkillId: 'footwork' })
  })

  it.each([
    { ...action, blockId: 'missing' }, { ...action, exerciseId: 'missing' },
    { ...action, exerciseId: 'rest' }, { ...action, exerciseId: 'one' },
  ])('ignores nonexistent, break or unchanged selections: %j', (selection) => {
    const state = workoutPlanToBuilderState(plan)
    expect(workoutBuilderReducer(state, selection)).toBe(state)
  })
})

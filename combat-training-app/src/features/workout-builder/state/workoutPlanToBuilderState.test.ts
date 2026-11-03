import { describe, expect, it } from 'vitest'

import { finalizeWorkoutPlan } from '@/domain/workout/finalizeWorkoutPlan'
import { workoutBuilderReducer } from '@/features/workout-builder/state/workoutBuilder.reducer'
import { workoutPlanToBuilderState } from '@/features/workout-builder/state/workoutPlanToBuilderState'
import { block, continuousExercise, roundsExercise, workoutBreak, workoutPlan } from '@/test/workoutBuilders'

describe('workoutPlanToBuilderState', () => {
  it.each([null, 'Trening techniczny'])('round-trips a plan with customName %s without changes', (customName) => {
    const rounds = { ...roundsExercise('rounds', 3, 180, 60), combinationId: 'jab_cross', instruction: 'Keep guard up' }
    const plan = workoutPlan([
      block('warmup', [continuousExercise('warmup-exercise', 120)], 'warmup'),
      block('technique', [rounds, { ...workoutBreak('break', 45), instruction: 'Drink water' }]),
    ])
    plan.customName = customName
    plan.nameSnapshot = customName ?? plan.nameSnapshot
    plan.mainGoal = 'Poprawa techniki'

    const state = workoutPlanToBuilderState(plan)
    expect(state.isDirty).toBe(false)
    expect(state.disciplineLocked).toBe(true)
    expect(finalizeWorkoutPlan(state.draft)).toEqual({ ok: true, plan })
  })

  it('copies nested items so editing cannot mutate the saved plan', () => {
    const plan = workoutPlan([block('block', [roundsExercise('rounds', 3, 180, 60)])])
    const original = structuredClone(plan)
    const state = workoutPlanToBuilderState(plan)
    state.draft.blocks[0].items[0] = continuousExercise('replacement', 60)
    expect(plan).toEqual(original)
  })

  it('keeps the discipline locked and preserves identity when editing', () => {
    const plan = workoutPlan([block('block', [continuousExercise('exercise', 60)])])
    const state = workoutPlanToBuilderState(plan)
    expect(workoutBuilderReducer(state, { type: 'setDiscipline', disciplineKey: 'muay_thai' })).toBe(state)

    const edited = workoutBuilderReducer(state, { type: 'setCustomName', customName: 'Nowa nazwa' })
    const result = finalizeWorkoutPlan(edited.draft)
    expect(result).toEqual({ ok: true, plan: { ...plan, customName: 'Nowa nazwa', nameSnapshot: 'Nowa nazwa' } })
  })

  it('allows changing the discipline when a plan contains only breaks', () => {
    const state = workoutPlanToBuilderState(workoutPlan([block('block', [workoutBreak('break', 60)])]))
    expect(state.disciplineLocked).toBe(false)
    expect(workoutBuilderReducer(state, { type: 'setDiscipline', disciplineKey: 'k1' }).draft.disciplineKey).toBe('k1')
  })
})

import { describe, expect, it } from 'vitest'
import { block, continuousExercise, roundsExercise, workoutBreak, workoutPlan } from '@/test/workoutBuilders'
import { workoutParameterChips } from './workoutParameterChips'

describe('workout parameter chips', () => {
  it('aggregates equal rounds across blocks and ignores standalone breaks for round rest', () => {
    const plan = workoutPlan([block('a', [roundsExercise('a', 3, 180, 60), workoutBreak('break', 30)]), block('b', [roundsExercise('b', 3, 180, 60)])])
    expect(workoutParameterChips(plan)).toEqual(['6 rund × 3 min', 'Przerwa 60 s'])
  })
  it('uses the complete estimate for unequal rounds and omits unequal rests', () => {
    const plan = workoutPlan([block('a', [roundsExercise('a', 3, 180, 60), roundsExercise('b', 6, 120, 30), continuousExercise('c', 300), workoutBreak('rest', 150)])])
    expect(workoutParameterChips(plan)).toEqual(['9 rund · 33:00'])
  })
  it('formats seconds without inventing a between-round break for a single round', () => {
    expect(workoutParameterChips(workoutPlan([block('a', [roundsExercise('a', 1, 90, 60)])]))).toEqual(['1 runda × 1:30'])
  })
  it('keeps an explicit zero rest and ignores irrelevant single-round rest settings', () => {
    expect(workoutParameterChips(workoutPlan([block('a', [roundsExercise('a', 2, 60, 0), roundsExercise('b', 1, 60, 30)])]))).toEqual(['3 rundy × 1 min', 'Przerwa 0 s'])
  })
  it('does not invent rounds or rests for continuous and empty plans', () => {
    expect(workoutParameterChips(workoutPlan([block('a', [continuousExercise('a', 60)])]))).toEqual([])
    expect(workoutParameterChips(workoutPlan([]))).toEqual([])
  })
})

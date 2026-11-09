import { describe, expect, it } from 'vitest'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import { block, continuousExercise } from '@/test/workoutBuilders'
import { selectWorkoutFocusSkills } from './selectWorkoutFocusSkills'

const instant = '2026-11-01T10:00:00.000Z'
const guard: FocusSkill = {
  id: 'guard', name: 'Guard', criterion: 'Hand returns to chin', openCorrection: null,
  archivedAt: null, createdAt: instant, updatedAt: instant,
}
const blocks = [block('bag', [
  { ...continuousExercise('first', 60), focusSkillId: 'guard' },
  { ...continuousExercise('second', 60), focusSkillId: 'counter' },
  { ...continuousExercise('repeat', 60), focusSkillId: 'guard' },
])]

describe('selectWorkoutFocusSkills', () => {
  it('admits all referenced skills from cache without waiting for the server', () => {
    const counter = { ...guard, id: 'counter' }
    expect(selectWorkoutFocusSkills(blocks, {
      status: 'ready', fromCache: true, items: [guard, counter, { ...guard, id: 'unused' }],
    }, false)).toEqual([guard, counter])
  })

  it.each(['loading', 'ready'] as const)('waits for missing skills while the collection is %s from cache', (status) => {
    expect(selectWorkoutFocusSkills(blocks, { status, fromCache: true, items: [guard] }, false)).toBeNull()
  })

  it('admits the available skills when the server confirms the incomplete collection', () => {
    expect(selectWorkoutFocusSkills(blocks, { status: 'ready', fromCache: false, items: [guard] }, false)).toEqual([guard])
  })

  it.each(['loading', 'ready', 'error'] as const)('admits available skills after the wait expires with status %s', (status) => {
    expect(selectWorkoutFocusSkills(blocks, { status, fromCache: true, items: [guard] }, true)).toEqual([guard])
  })

  it('does not wait for a collection that the plan does not use', () => {
    expect(selectWorkoutFocusSkills([block('bag', [continuousExercise('plain', 60)])], {
      status: 'loading', fromCache: true, items: [],
    }, false)).toEqual([])
  })
})

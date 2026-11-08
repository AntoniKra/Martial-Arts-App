import { describe, expect, it } from 'vitest'
import { countFocusExercises, selectAvailableFocusSkills } from './focusSkillSelectors'
import { block, continuousExercise, workoutBreak } from '@/test/workoutBuilders'

describe('focus skill selectors', () => {
  it('counts occurrences across blocks, including repeated skills, without counting breaks', () => {
    const focused = { ...continuousExercise('one', 60), focusSkillId: 'guard' }
    expect(countFocusExercises([
      block('bag', [focused, workoutBreak('rest', 30), continuousExercise('unmarked', 60)]),
      block('pads', [{ ...focused, id: 'two' }]),
    ])).toBe(2)
  })

  it('lists active skills alphabetically without mutating the source', () => {
    const skills = [{ id: 'b', name: 'B', archivedAt: null }, { id: 'a', name: 'A', archivedAt: null },
      { id: 'old', name: 'Archived', archivedAt: '2026-11-08T09:00:00.000Z' }]
    expect(selectAvailableFocusSkills(skills).map((skill) => skill.id)).toEqual(['a', 'b'])
    expect(skills.map((skill) => skill.id)).toEqual(['b', 'a', 'old'])
  })
})

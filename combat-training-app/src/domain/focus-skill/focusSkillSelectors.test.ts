import { describe, expect, it } from 'vitest'
import { countFocusExercises, selectAvailableFocusSkills, selectPlanCorrections } from './focusSkillSelectors'
import type { FocusSkill } from './focusSkill.types'
import { block, continuousExercise, workoutBreak } from '@/test/workoutBuilders'

describe('focus skill selectors', () => {
  it('shows each open correction once in plan order, excluding unrelated skills', () => {
    const correction = { problem: 'Guard', fix: 'Chin', sessionId: 'previous', workoutDate: '2026-11-01' }
    const skill: FocusSkill = { id: 'guard', name: 'Guard', criterion: 'Chin', openCorrection: correction,
      archivedAt: null, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z' }
    const focused = { ...continuousExercise('first', 60), focusSkillId: 'guard' }
    expect(selectPlanCorrections([block('bag', [focused, { ...focused, id: 'second' }])], [
      { ...skill, id: 'unrelated' }, skill,
    ])).toEqual([{ focusSkillId: 'guard', name: 'Guard', correction }])
  })
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

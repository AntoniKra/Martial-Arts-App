import { describe, expect, it } from 'vitest'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import { createWorkoutPlaybackTimeline } from '@/domain/workout-playback/createWorkoutPlaybackTimeline'
import { block, continuousExercise, roundsExercise, workoutBreak, workoutPlan } from '@/test/workoutBuilders'
import { selectWorkoutFocusCue } from './selectWorkoutFocusCue'

const instant = '2026-11-01T10:00:00.000Z'
const guard: FocusSkill = {
  id: 'guard', name: 'Powrót do gardy', criterion: 'Ręka wraca do brody.',
  archivedAt: null, openCorrection: null, createdAt: instant, updatedAt: instant,
}
const counter: FocusSkill = { ...guard, id: 'counter', name: 'Kontra po zejściu' }
const plan = workoutPlan([block('bag', [
  { ...roundsExercise('guard-rounds', 2, 60, 30), focusSkillId: guard.id },
  workoutBreak('break-before-counter', 30),
  { ...roundsExercise('counter-rounds', 1, 60, 0), focusSkillId: counter.id },
  workoutBreak('break-before-plain', 30),
  roundsExercise('plain-rounds', 1, 60, 0),
  { ...continuousExercise('continuous', 60), focusSkillId: guard.id },
])])
const [firstRound, roundRest, secondRound, firstBreak, counterRound, secondBreak, plainRound, continuous] =
  createWorkoutPlaybackTimeline(plan).steps
const skills = [guard, counter]

describe('selectWorkoutFocusCue', () => {
  it.each(['running', 'paused'] as const)('selects the current round during %s', (status) => {
    expect(selectWorkoutFocusCue(status, secondRound, firstBreak, plan.blocks, skills)).toEqual({ kind: 'badge', skill: guard })
  })

  it('selects the first round during preparation', () => {
    expect(selectWorkoutFocusCue('preparing', firstRound, firstRound, plan.blocks, skills)).toEqual({ kind: 'card', skill: guard })
    expect(selectWorkoutFocusCue('preparing', firstBreak, firstBreak, plan.blocks, skills)).toBeNull()
  })

  it('selects the upcoming round during rest, including a break before a different exercise', () => {
    expect(selectWorkoutFocusCue('running', roundRest, secondRound, plan.blocks, skills)).toEqual({ kind: 'card', skill: guard })
    expect(selectWorkoutFocusCue('running', firstBreak, counterRound, plan.blocks, skills)).toEqual({ kind: 'card', skill: counter })
  })

  it('omits both presentations when the focus skill was archived or is missing', () => {
    for (const unavailable of [[{ ...guard, archivedAt: instant }, counter], [counter]]) {
      expect(selectWorkoutFocusCue('running', firstRound, roundRest, plan.blocks, unavailable)).toBeNull()
      expect(selectWorkoutFocusCue('running', roundRest, secondRound, plan.blocks, unavailable)).toBeNull()
    }
  })

  it('omits cues outside active rounds and breaks leading directly to a focused round', () => {
    expect(selectWorkoutFocusCue('idle', firstRound, roundRest, plan.blocks, skills)).toBeNull()
    expect(selectWorkoutFocusCue('completed', firstRound, null, plan.blocks, skills)).toBeNull()
    expect(selectWorkoutFocusCue('running', secondBreak, plainRound, plan.blocks, skills)).toBeNull()
    expect(selectWorkoutFocusCue('running', plainRound, continuous, plan.blocks, skills)).toBeNull()
    expect(selectWorkoutFocusCue('running', continuous, null, plan.blocks, skills)).toBeNull()
  })
})

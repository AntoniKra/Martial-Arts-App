import { describe, expect, it } from 'vitest'
import { createWorkoutPlaybackTimeline } from '@/domain/workout-playback/createWorkoutPlaybackTimeline'
import { block, continuousExercise, roundsExercise, workoutBreak, workoutPlan } from '@/test/workoutBuilders'
import { workoutPlayerLabels } from '../workoutPlayerLabels'
import { countRemainingExerciseRounds } from './countRemainingExerciseRounds'

describe('remaining exercise rounds', () => {
  const { steps } = createWorkoutPlaybackTimeline(workoutPlan([
    block('first', [roundsExercise('rounds', 3, 60, 30), continuousExercise('continuous', 60), workoutBreak('break', 30)]),
    block('second', [roundsExercise('rounds', 2, 60, 0)]),
  ]))
  it('includes the current unfinished round, excludes rests and stops at the next item or block', () => {
    expect(steps.map((_, index) => countRemainingExerciseRounds(steps, index))).toEqual([3, 2, 2, 1, 1, 1, 0, 2, 1])
    expect(countRemainingExerciseRounds(steps, steps.length)).toBe(0)
  })
  it.each([[1, 'runda'], [2, 'rundy'], [3, 'rundy'], [5, 'rund'], [12, 'rund'], [22, 'rundy']])(
    'labels %i remaining rounds', (count, noun) => {
      expect(workoutPlayerLabels.skipExercise(Number(count))).toBe(`Pomiń resztę ćwiczenia (${count} ${noun})`)
    },
  )
})

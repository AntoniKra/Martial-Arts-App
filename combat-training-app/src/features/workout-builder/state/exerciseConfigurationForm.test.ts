import { describe, expect, it } from 'vitest'

import type { ExerciseConfiguration } from '@/domain/workout/workout.types'
import {
  createExerciseConfigurationFormState,
  EXERCISE_ROUND_FORMATS,
  exerciseConfigurationFormReducer,
  selectedRoundFormat,
  showsRestBetweenRounds,
  toExerciseConfiguration,
} from '@/features/workout-builder/state/exerciseConfigurationForm'

const twoShortRounds: ExerciseConfiguration = {
  mode: 'rounds',
  roundCount: 2,
  roundDurationSeconds: 60,
  restBetweenRoundsSeconds: 45,
}

describe('exercise configuration form', () => {
  it('offers the three approved ready formats', () => {
    expect(EXERCISE_ROUND_FORMATS.map(({ roundCount, roundDurationSeconds, restBetweenRoundsSeconds }) =>
      [roundCount, roundDurationSeconds, restBetweenRoundsSeconds])).toEqual([[3, 180, 60], [3, 180, 30], [5, 180, 60]])
  })

  it('sets round count, round duration and rest from a format', () => {
    const start = createExerciseConfigurationFormState(twoShortRounds, null)

    const next = exerciseConfigurationFormReducer(start, { type: 'applyRoundFormat', formatId: 'five-by-three-rest-60' })

    expect(next).toMatchObject({ roundCount: 5, roundDurationSeconds: 180, restSeconds: 60 })
    expect(selectedRoundFormat(next)?.id).toBe('five-by-three-rest-60')
  })

  it('selects a format only while the steppers hold exactly its values', () => {
    const start = createExerciseConfigurationFormState(
      { mode: 'rounds', roundCount: 1, roundDurationSeconds: 60, restBetweenRoundsSeconds: 120 },
      null,
    )
    expect(selectedRoundFormat(start)).toBeNull()

    const formatted = exerciseConfigurationFormReducer(start, { type: 'applyRoundFormat', formatId: 'three-by-three-rest-30' })
    expect(selectedRoundFormat(formatted)?.id).toBe('three-by-three-rest-30')

    const longer = exerciseConfigurationFormReducer(formatted, { type: 'step', field: 'roundDuration', direction: 1 })
    expect(longer.roundDurationSeconds).toBe(195)
    expect(selectedRoundFormat(longer)).toBeNull()

    const back = exerciseConfigurationFormReducer(longer, { type: 'step', field: 'roundDuration', direction: -1 })
    expect(selectedRoundFormat(back)?.id).toBe('three-by-three-rest-30')

    const restUp = exerciseConfigurationFormReducer(back, { type: 'step', field: 'rest', direction: 1 })
    expect(selectedRoundFormat(restUp)).toBeNull()
    const longerRest = exerciseConfigurationFormReducer(restUp, { type: 'step', field: 'rest', direction: 1 })
    expect(selectedRoundFormat(longerRest)?.id).toBe('three-by-three-rest-60')
  })

  it('steps each value within its limits', () => {
    const start = createExerciseConfigurationFormState(
      { mode: 'rounds', roundCount: 1, roundDurationSeconds: 100, restBetweenRoundsSeconds: 0 },
      null,
    )

    expect(exerciseConfigurationFormReducer(start, { type: 'step', field: 'roundCount', direction: -1 })).toBe(start)
    expect(exerciseConfigurationFormReducer(start, { type: 'step', field: 'roundCount', direction: 1 }).roundCount).toBe(2)
    expect(exerciseConfigurationFormReducer(start, { type: 'step', field: 'roundDuration', direction: -1 }).roundDurationSeconds).toBe(90)
    expect(exerciseConfigurationFormReducer(start, { type: 'step', field: 'rest', direction: -1 })).toBe(start)
  })

  it('sets a typed value', () => {
    const start = createExerciseConfigurationFormState(twoShortRounds, null)

    expect(exerciseConfigurationFormReducer(start, { type: 'setValue', field: 'roundCount', value: 12 }).roundCount).toBe(12)
    expect(exerciseConfigurationFormReducer(start, { type: 'setValue', field: 'rest', value: 0 }).restSeconds).toBe(0)
  })

  it('steps the continuous duration by 15 s', () => {
    const start = createExerciseConfigurationFormState({ mode: 'continuous', durationSeconds: 300 }, null)

    const next = exerciseConfigurationFormReducer(start, { type: 'step', field: 'continuousDuration', direction: 1 })

    expect(next.continuousSeconds).toBe(315)
    expect(toExerciseConfiguration(next)).toEqual({ mode: 'continuous', durationSeconds: 315 })
  })

  it('shows inherited round values after switching a continuous exercise to rounds', () => {
    const start = createExerciseConfigurationFormState(
      { mode: 'continuous', durationSeconds: 90 },
      null,
      { roundCount: 2, roundDurationSeconds: 60, restBetweenRoundsSeconds: 30 },
    )

    expect(start).toMatchObject({ mode: 'continuous', continuousSeconds: 90 })

    const rounds = exerciseConfigurationFormReducer(start, { type: 'setMode', mode: 'rounds' })

    expect(rounds).toMatchObject({ mode: 'rounds', roundCount: 2, roundDurationSeconds: 60, restSeconds: 30 })
  })

  it('hides rest at one round and keeps the previous rest when the count returns', () => {
    const start = createExerciseConfigurationFormState(
      { mode: 'rounds', roundCount: 2, roundDurationSeconds: 180, restBetweenRoundsSeconds: 30 },
      null,
    )
    expect(showsRestBetweenRounds(start)).toBe(true)

    const oneRound = exerciseConfigurationFormReducer(start, { type: 'step', field: 'roundCount', direction: -1 })
    expect(showsRestBetweenRounds(oneRound)).toBe(false)
    expect(toExerciseConfiguration(oneRound)).toEqual({
      mode: 'rounds', roundCount: 1, roundDurationSeconds: 180, restBetweenRoundsSeconds: 30,
    })

    const restored = exerciseConfigurationFormReducer(oneRound, { type: 'setValue', field: 'roundCount', value: 3 })
    expect(showsRestBetweenRounds(restored)).toBe(true)
    expect(selectedRoundFormat(restored)?.id).toBe('three-by-three-rest-30')
  })

  it('keeps the instruction and the mode in the saved configuration', () => {
    const start = createExerciseConfigurationFormState(twoShortRounds, 'Szybko')
    expect(start.instructionInput).toBe('Szybko')

    const changed = exerciseConfigurationFormReducer(start, { type: 'setInstruction', value: 'Wolno' })
    expect(changed.instructionInput).toBe('Wolno')
    expect(toExerciseConfiguration(changed)).toEqual(twoShortRounds)
  })
})

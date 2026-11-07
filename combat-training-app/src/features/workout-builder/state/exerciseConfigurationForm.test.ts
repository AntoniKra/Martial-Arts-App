import { describe, expect, it } from 'vitest'

import type { ExerciseConfiguration } from '@/domain/workout/workout.types'
import {
  createExerciseConfigurationFormState,
  exerciseConfigurationFormReducer,
  selectedRoundFormat,
  type ExerciseConfigurationFieldErrors,
  type ExerciseConfigurationFormState,
} from '@/features/workout-builder/state/exerciseConfigurationForm'

const twoShortRounds: ExerciseConfiguration = {
  mode: 'rounds',
  roundCount: 2,
  roundDurationSeconds: 60,
  restBetweenRoundsSeconds: 45,
}

const fieldErrors: ExerciseConfigurationFieldErrors = {
  roundCount: 'Liczba rund musi być liczbą całkowitą od 1 do 99.',
  roundDuration: 'Łączny czas musi być większy od 0.',
  rest: 'Sekundy muszą być w zakresie od 0 do 59.',
  continuousDuration: 'Minuty i sekundy muszą być liczbami całkowitymi od 0.',
}

function withFieldErrors(state: ExerciseConfigurationFormState): ExerciseConfigurationFormState {
  return exerciseConfigurationFormReducer(state, { type: 'replaceFieldErrors', errors: fieldErrors })
}

describe('exercise configuration form', () => {
  it('sets round count, round duration and rest from a format', () => {
    const start = createExerciseConfigurationFormState(twoShortRounds, null)
    const withErrors = withFieldErrors(start)

    const next = exerciseConfigurationFormReducer(withErrors, {
      type: 'applyRoundFormat',
      formatId: 'three-by-three-rest-30',
    })

    expect(next.roundCountPreset).toBe(3)
    expect(next.roundCountInput).toBe('3')
    expect(next.roundDurationPreset).toBe(180)
    expect(next.restPreset).toBe(30)
    expect(selectedRoundFormat(next)?.label).toBe('3 × 3:00 · przerwa 0:30')
    expect(next.errors.roundCount).toBeNull()
    expect(next.errors.roundDuration).toBeNull()
    expect(next.errors.rest).toBeNull()
    expect(next.errors.continuousDuration).toBe(fieldErrors.continuousDuration)
  })

  it('highlights a format only while all three values match', () => {
    const start = createExerciseConfigurationFormState(
      { mode: 'rounds', roundCount: 1, roundDurationSeconds: 60, restBetweenRoundsSeconds: 120 },
      null,
    )
    expect(selectedRoundFormat(start)).toBeNull()

    const formatted = exerciseConfigurationFormReducer(start, {
      type: 'applyRoundFormat',
      formatId: 'three-by-three-rest-60',
    })
    expect(selectedRoundFormat(formatted)?.label).toBe('3 × 3:00 · przerwa 1:00')

    const customValues = exerciseConfigurationFormReducer(
      exerciseConfigurationFormReducer(
        exerciseConfigurationFormReducer(formatted, { type: 'selectRoundCountPreset', value: 'custom' }),
        { type: 'selectRoundDurationPreset', value: 'custom' },
      ),
      { type: 'selectRestPreset', value: 'custom' },
    )
    expect(selectedRoundFormat(customValues)?.label).toBe('3 × 3:00 · przerwa 1:00')

    const changedCount = exerciseConfigurationFormReducer(formatted, {
      type: 'selectRoundCountPreset',
      value: 4,
    })
    expect(selectedRoundFormat(changedCount)).toBeNull()

    const restored = exerciseConfigurationFormReducer(
      exerciseConfigurationFormReducer(
        exerciseConfigurationFormReducer(changedCount, { type: 'selectRoundCountPreset', value: 3 }),
        { type: 'selectRoundDurationPreset', value: 180 },
      ),
      { type: 'selectRestPreset', value: 30 },
    )
    expect(selectedRoundFormat(restored)?.label).toBe('3 × 3:00 · przerwa 0:30')
  })

  it('clears the round count error when the round count changes', () => {
    const start = withFieldErrors(createExerciseConfigurationFormState(twoShortRounds, null))

    const fromTile = exerciseConfigurationFormReducer(start, { type: 'selectRoundCountPreset', value: 5 })
    expect(fromTile.errors.roundCount).toBeNull()
    expect(fromTile.errors.roundDuration).toBe(fieldErrors.roundDuration)
    expect(fromTile.errors.rest).toBe(fieldErrors.rest)
    expect(fromTile.errors.continuousDuration).toBe(fieldErrors.continuousDuration)

    const fromInput = exerciseConfigurationFormReducer(start, { type: 'setRoundCountInput', value: '8' })
    expect(fromInput.roundCountInput).toBe('8')
    expect(fromInput.errors.roundCount).toBeNull()
    expect(fromInput.errors.roundDuration).toBe(fieldErrors.roundDuration)
  })

  it('keeps the round count error when własna is opened on the same invalid number', () => {
    const start = withFieldErrors(
      createExerciseConfigurationFormState(
        { mode: 'rounds', roundCount: 0, roundDurationSeconds: 180, restBetweenRoundsSeconds: 60 },
        null,
      ),
    )

    const next = exerciseConfigurationFormReducer(start, { type: 'selectRoundCountPreset', value: 'custom' })

    expect(next.roundCountPreset).toBe('custom')
    expect(next.roundCountInput).toBe('0')
    expect(next.errors.roundCount).toBe(fieldErrors.roundCount)
  })

  it('clears the custom round duration error when that duration changes', () => {
    const start = withFieldErrors(createExerciseConfigurationFormState(twoShortRounds, null))

    const next = exerciseConfigurationFormReducer(start, { type: 'setRoundDurationMinutes', value: '4' })

    expect(next.roundDurationCustom.minutes).toBe('4')
    expect(next.errors.roundDuration).toBeNull()
    expect(next.errors.roundCount).toBe(fieldErrors.roundCount)
    expect(next.errors.rest).toBe(fieldErrors.rest)
    expect(next.errors.continuousDuration).toBe(fieldErrors.continuousDuration)
  })

  it('clears the custom rest error when that rest changes', () => {
    const start = withFieldErrors(createExerciseConfigurationFormState(twoShortRounds, null))

    const next = exerciseConfigurationFormReducer(start, { type: 'setRestSeconds', value: '15' })

    expect(next.restCustom.seconds).toBe('15')
    expect(next.errors.rest).toBeNull()
    expect(next.errors.roundCount).toBe(fieldErrors.roundCount)
    expect(next.errors.roundDuration).toBe(fieldErrors.roundDuration)
    expect(next.errors.continuousDuration).toBe(fieldErrors.continuousDuration)
  })

  it('clears the continuous duration error when that duration changes', () => {
    const start = withFieldErrors(
      createExerciseConfigurationFormState({ mode: 'continuous', durationSeconds: 300 }, null),
    )

    const next = exerciseConfigurationFormReducer(start, { type: 'setContinuousMinutes', value: '12' })

    expect(next.continuousMinutesInput).toBe('12')
    expect(next.errors.continuousDuration).toBeNull()
    expect(next.errors.roundCount).toBe(fieldErrors.roundCount)
    expect(next.errors.roundDuration).toBe(fieldErrors.roundDuration)
    expect(next.errors.rest).toBe(fieldErrors.rest)
  })
})

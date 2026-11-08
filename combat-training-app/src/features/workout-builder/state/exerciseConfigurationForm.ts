import type { ExerciseConfiguration, ExerciseMode } from '@/domain/workout/workout.types'
import {
  computeDurationSeconds,
  parseRequiredNonNegativeInteger,
} from '@/features/workout-builder/utils/durationInput'

export const ROUND_COUNT_PRESETS = [1, 2, 3, 4, 5] as const
export const ROUND_DURATION_PRESETS = [60, 90, 120, 180] as const
export const REST_PRESETS = [30, 60, 90, 120] as const

export const ROUND_FORMAT_PRESETS = [
  {
    id: 'three-by-three-rest-60',
    label: '3 × 3:00 · przerwa 1:00',
    roundCount: 3,
    roundDurationSeconds: 180,
    restBetweenRoundsSeconds: 60,
  },
  {
    id: 'three-by-three-rest-30',
    label: '3 × 3:00 · przerwa 0:30',
    roundCount: 3,
    roundDurationSeconds: 180,
    restBetweenRoundsSeconds: 30,
  },
] as const

export type RoundFormatId = (typeof ROUND_FORMAT_PRESETS)[number]['id']
export type RoundFormatPreset = (typeof ROUND_FORMAT_PRESETS)[number]

type NumericPreset = number | 'custom'

interface DurationFields {
  minutes: string
  seconds: string
}

export interface ExerciseConfigurationFieldErrors {
  roundCount: string | null
  roundDuration: string | null
  rest: string | null
  continuousDuration: string | null
}

export interface ExerciseConfigurationFormState {
  mode: Exclude<ExerciseMode, 'strength'>
  roundCountPreset: NumericPreset
  roundCountInput: string
  roundDurationPreset: NumericPreset
  roundDurationCustom: DurationFields
  restPreset: NumericPreset
  restCustom: DurationFields
  continuousMinutesInput: string
  continuousSecondsInput: string
  instructionInput: string
  errors: ExerciseConfigurationFieldErrors
}

export type ExerciseConfigurationFormAction =
  | { type: 'setMode'; mode: Exclude<ExerciseMode, 'strength'> }
  | { type: 'selectRoundCountPreset'; value: NumericPreset }
  | { type: 'setRoundCountInput'; value: string }
  | { type: 'selectRoundDurationPreset'; value: NumericPreset }
  | { type: 'setRoundDurationMinutes'; value: string }
  | { type: 'setRoundDurationSeconds'; value: string }
  | { type: 'selectRestPreset'; value: NumericPreset }
  | { type: 'setRestMinutes'; value: string }
  | { type: 'setRestSeconds'; value: string }
  | { type: 'setContinuousMinutes'; value: string }
  | { type: 'setContinuousSeconds'; value: string }
  | { type: 'setInstruction'; value: string }
  | { type: 'applyRoundFormat'; formatId: RoundFormatId }
  | { type: 'replaceFieldErrors'; errors: ExerciseConfigurationFieldErrors }

export function emptyExerciseConfigurationFieldErrors(): ExerciseConfigurationFieldErrors {
  return {
    roundCount: null,
    roundDuration: null,
    rest: null,
    continuousDuration: null,
  }
}

function resolvePreset(value: number, presets: readonly number[]): NumericPreset {
  return presets.includes(value) ? value : 'custom'
}

function secondsToCustomFields(totalSeconds: number): DurationFields {
  return {
    minutes: String(Math.floor(totalSeconds / 60)),
    seconds: String(totalSeconds % 60),
  }
}

export function createExerciseConfigurationFormState(
  configuration: ExerciseConfiguration,
  instruction: string | null,
  roundSettings?: {
    roundCount: number
    roundDurationSeconds: number
    restBetweenRoundsSeconds: number
  } | null,
): ExerciseConfigurationFormState {
  const roundsConfiguration =
    configuration.mode === 'rounds'
      ? configuration
      : roundSettings ?? { roundCount: 3, roundDurationSeconds: 180, restBetweenRoundsSeconds: 60 }
  const continuousSeconds = configuration.mode === 'continuous' ? configuration.durationSeconds : 300

  return {
    mode: configuration.mode === 'continuous' ? 'continuous' : 'rounds',
    roundCountPreset: resolvePreset(roundsConfiguration.roundCount, ROUND_COUNT_PRESETS),
    roundCountInput: String(roundsConfiguration.roundCount),
    roundDurationPreset: resolvePreset(roundsConfiguration.roundDurationSeconds, ROUND_DURATION_PRESETS),
    roundDurationCustom: secondsToCustomFields(roundsConfiguration.roundDurationSeconds),
    restPreset: resolvePreset(roundsConfiguration.restBetweenRoundsSeconds, REST_PRESETS),
    restCustom: secondsToCustomFields(roundsConfiguration.restBetweenRoundsSeconds),
    continuousMinutesInput: String(Math.floor(continuousSeconds / 60)),
    continuousSecondsInput: String(continuousSeconds % 60),
    instructionInput: instruction ?? '',
    errors: emptyExerciseConfigurationFieldErrors(),
  }
}

function withoutError(
  state: ExerciseConfigurationFormState,
  field: keyof ExerciseConfigurationFieldErrors,
): ExerciseConfigurationFormState {
  if (state.errors[field] === null) {
    return state
  }

  return {
    ...state,
    errors: {
      ...state.errors,
      [field]: null,
    },
  }
}

function readOptionalSeconds(
  preset: NumericPreset,
  fields: DurationFields,
  allowZero: boolean,
): number | null {
  if (preset !== 'custom') {
    return preset
  }

  return computeDurationSeconds(fields.minutes, fields.seconds, allowZero).seconds
}

export function readRoundCount(state: ExerciseConfigurationFormState): number | null {
  if (state.roundCountPreset === 'custom') {
    return parseRequiredNonNegativeInteger(state.roundCountInput)
  }

  return state.roundCountPreset
}

/** One round has no rest between rounds, so the rest controls stay hidden. The stored rest is kept. */
export function showsRestBetweenRounds(state: ExerciseConfigurationFormState): boolean {
  return readRoundCount(state) !== 1
}

export function resolveRestBetweenRoundsSeconds(
  roundCount: number,
  parsed: { seconds: number | null; error: string | null },
  preservedSeconds: number,
): { ok: true; seconds: number } | { ok: false; error: string } {
  if (parsed.error === null && parsed.seconds !== null) {
    return { ok: true, seconds: parsed.seconds }
  }

  if (roundCount === 1) {
    return { ok: true, seconds: preservedSeconds }
  }

  return { ok: false, error: parsed.error ?? 'Minuty i sekundy muszą być liczbami całkowitymi od 0.' }
}

export function selectedRoundFormat(state: ExerciseConfigurationFormState): RoundFormatPreset | null {
  const roundCount = readRoundCount(state)
  const roundDurationSeconds = readOptionalSeconds(state.roundDurationPreset, state.roundDurationCustom, false)
  const restBetweenRoundsSeconds = readOptionalSeconds(state.restPreset, state.restCustom, true)

  if (roundCount === null || roundDurationSeconds === null || restBetweenRoundsSeconds === null) {
    return null
  }

  return (
    ROUND_FORMAT_PRESETS.find(
      (preset) =>
        preset.roundCount === roundCount &&
        preset.roundDurationSeconds === roundDurationSeconds &&
        preset.restBetweenRoundsSeconds === restBetweenRoundsSeconds,
    ) ?? null
  )
}

export function exerciseConfigurationFormReducer(
  state: ExerciseConfigurationFormState,
  action: ExerciseConfigurationFormAction,
): ExerciseConfigurationFormState {
  switch (action.type) {
    case 'setMode':
      return state.mode === action.mode ? state : { ...state, mode: action.mode }
    case 'selectRoundCountPreset':
      if (action.value === 'custom') {
        return { ...state, roundCountPreset: 'custom' }
      }

      return withoutError(
        {
          ...state,
          roundCountPreset: action.value,
          roundCountInput: String(action.value),
        },
        'roundCount',
      )
    case 'setRoundCountInput':
      return withoutError({ ...state, roundCountInput: action.value }, 'roundCount')
    case 'selectRoundDurationPreset':
      if (action.value === 'custom') {
        return { ...state, roundDurationPreset: 'custom' }
      }

      return withoutError(
        {
          ...state,
          roundDurationPreset: action.value,
          roundDurationCustom: secondsToCustomFields(action.value),
        },
        'roundDuration',
      )
    case 'setRoundDurationMinutes':
      return withoutError(
        {
          ...state,
          roundDurationCustom: { ...state.roundDurationCustom, minutes: action.value },
        },
        'roundDuration',
      )
    case 'setRoundDurationSeconds':
      return withoutError(
        {
          ...state,
          roundDurationCustom: { ...state.roundDurationCustom, seconds: action.value },
        },
        'roundDuration',
      )
    case 'selectRestPreset':
      if (action.value === 'custom') {
        return { ...state, restPreset: 'custom' }
      }

      return withoutError(
        {
          ...state,
          restPreset: action.value,
          restCustom: secondsToCustomFields(action.value),
        },
        'rest',
      )
    case 'setRestMinutes':
      return withoutError(
        {
          ...state,
          restCustom: { ...state.restCustom, minutes: action.value },
        },
        'rest',
      )
    case 'setRestSeconds':
      return withoutError(
        {
          ...state,
          restCustom: { ...state.restCustom, seconds: action.value },
        },
        'rest',
      )
    case 'setContinuousMinutes':
      return withoutError({ ...state, continuousMinutesInput: action.value }, 'continuousDuration')
    case 'setContinuousSeconds':
      return withoutError({ ...state, continuousSecondsInput: action.value }, 'continuousDuration')
    case 'setInstruction':
      return state.instructionInput === action.value ? state : { ...state, instructionInput: action.value }
    case 'applyRoundFormat': {
      const format = ROUND_FORMAT_PRESETS.find((preset) => preset.id === action.formatId)

      if (!format) {
        return state
      }

      return {
        ...state,
        roundCountPreset: resolvePreset(format.roundCount, ROUND_COUNT_PRESETS),
        roundCountInput: String(format.roundCount),
        roundDurationPreset: resolvePreset(format.roundDurationSeconds, ROUND_DURATION_PRESETS),
        roundDurationCustom: secondsToCustomFields(format.roundDurationSeconds),
        restPreset: resolvePreset(format.restBetweenRoundsSeconds, REST_PRESETS),
        restCustom: secondsToCustomFields(format.restBetweenRoundsSeconds),
        errors: {
          ...state.errors,
          roundCount: null,
          roundDuration: null,
          rest: null,
        },
      }
    }
    case 'replaceFieldErrors':
      return { ...state, errors: action.errors }
    default: {
      const unreachable: never = action
      return unreachable
    }
  }
}

import type { ExerciseConfiguration, ExerciseMode } from '@/domain/workout/workout.types'
import {
  canStep,
  stepValue,
  type StepDirection,
  type StepperField,
} from '@/features/workout-builder/state/exerciseStepper'

/** Ready formats on the exercise screen of the builder. They are not stored in the plan. */
export const EXERCISE_ROUND_FORMATS = [
  { id: 'three-by-three-rest-60', roundCount: 3, roundDurationSeconds: 180, restBetweenRoundsSeconds: 60 },
  { id: 'three-by-three-rest-30', roundCount: 3, roundDurationSeconds: 180, restBetweenRoundsSeconds: 30 },
  { id: 'five-by-three-rest-60', roundCount: 5, roundDurationSeconds: 180, restBetweenRoundsSeconds: 60 },
] as const

export type ExerciseRoundFormat = (typeof EXERCISE_ROUND_FORMATS)[number]
export type ExerciseRoundFormatId = ExerciseRoundFormat['id']

export interface ExerciseConfigurationFormState {
  mode: Exclude<ExerciseMode, 'strength'>
  roundCount: number
  roundDurationSeconds: number
  /** Kept while one round hides the rest, so the value returns with more rounds. */
  restSeconds: number
  continuousSeconds: number
  instructionInput: string
}

export type ExerciseConfigurationFormAction =
  | { type: 'setMode'; mode: Exclude<ExerciseMode, 'strength'> }
  | { type: 'step'; field: StepperField; direction: StepDirection }
  | { type: 'setValue'; field: StepperField; value: number }
  | { type: 'applyRoundFormat'; formatId: ExerciseRoundFormatId }
  | { type: 'setInstruction'; value: string }

const DEFAULT_ROUNDS = { roundCount: 3, roundDurationSeconds: 180, restBetweenRoundsSeconds: 60 }
const DEFAULT_CONTINUOUS_SECONDS = 300

const FIELD_KEYS = {
  roundCount: 'roundCount',
  roundDuration: 'roundDurationSeconds',
  rest: 'restSeconds',
  continuousDuration: 'continuousSeconds',
} as const satisfies Record<StepperField, keyof ExerciseConfigurationFormState>

export function readStepperValue(state: ExerciseConfigurationFormState, field: StepperField): number {
  return state[FIELD_KEYS[field]]
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
  const rounds = configuration.mode === 'rounds' ? configuration : roundSettings ?? DEFAULT_ROUNDS

  return {
    mode: configuration.mode === 'continuous' ? 'continuous' : 'rounds',
    roundCount: rounds.roundCount,
    roundDurationSeconds: rounds.roundDurationSeconds,
    restSeconds: rounds.restBetweenRoundsSeconds,
    continuousSeconds: configuration.mode === 'continuous' ? configuration.durationSeconds : DEFAULT_CONTINUOUS_SECONDS,
    instructionInput: instruction ?? '',
  }
}

/** One round has no rest between rounds, so the rest stepper stays hidden. The stored rest is kept. */
export function showsRestBetweenRounds(state: ExerciseConfigurationFormState): boolean {
  return state.roundCount !== 1
}

export function selectedRoundFormat(state: ExerciseConfigurationFormState): ExerciseRoundFormat | null {
  return EXERCISE_ROUND_FORMATS.find((format) =>
    format.roundCount === state.roundCount &&
    format.roundDurationSeconds === state.roundDurationSeconds &&
    format.restBetweenRoundsSeconds === state.restSeconds) ?? null
}

export function toExerciseConfiguration(state: ExerciseConfigurationFormState): ExerciseConfiguration {
  return state.mode === 'continuous'
    ? { mode: 'continuous', durationSeconds: state.continuousSeconds }
    : {
        mode: 'rounds',
        roundCount: state.roundCount,
        roundDurationSeconds: state.roundDurationSeconds,
        restBetweenRoundsSeconds: state.restSeconds,
      }
}

function withValue(state: ExerciseConfigurationFormState, field: StepperField, value: number): ExerciseConfigurationFormState {
  return readStepperValue(state, field) === value ? state : { ...state, [FIELD_KEYS[field]]: value }
}

export function exerciseConfigurationFormReducer(
  state: ExerciseConfigurationFormState,
  action: ExerciseConfigurationFormAction,
): ExerciseConfigurationFormState {
  switch (action.type) {
    case 'setMode':
      return state.mode === action.mode ? state : { ...state, mode: action.mode }
    case 'step': {
      const value = readStepperValue(state, action.field)
      if (!canStep(action.field, value, action.direction)) return state
      return withValue(state, action.field, stepValue(action.field, value, action.direction))
    }
    case 'setValue':
      return withValue(state, action.field, action.value)
    case 'applyRoundFormat': {
      const format = EXERCISE_ROUND_FORMATS.find((preset) => preset.id === action.formatId)
      if (!format) return state
      return {
        ...state,
        roundCount: format.roundCount,
        roundDurationSeconds: format.roundDurationSeconds,
        restSeconds: format.restBetweenRoundsSeconds,
      }
    }
    case 'setInstruction':
      return state.instructionInput === action.value ? state : { ...state, instructionInput: action.value }
    default: {
      const unreachable: never = action
      return unreachable
    }
  }
}

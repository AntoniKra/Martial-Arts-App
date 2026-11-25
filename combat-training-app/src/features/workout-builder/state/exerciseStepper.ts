import { ROUND_COUNT_MAX } from '@/features/workout-builder/state/workoutBuilder.types'

export type StepperField = 'roundCount' | 'roundDuration' | 'rest' | 'continuousDuration'

export type StepDirection = 1 | -1

/** One day: the largest duration accepted by the exercise validation in the builder. */
export const STEPPER_DURATION_MAX_SECONDS = 86_400

export const STEPPER_LIMITS: Record<StepperField, { min: number; max: number; step: number }> = {
  roundCount: { min: 1, max: ROUND_COUNT_MAX, step: 1 },
  roundDuration: { min: 1, max: STEPPER_DURATION_MAX_SECONDS, step: 15 },
  rest: { min: 0, max: STEPPER_DURATION_MAX_SECONDS, step: 15 },
  continuousDuration: { min: 1, max: STEPPER_DURATION_MAX_SECONDS, step: 15 },
}

/**
 * Steps a value by the field's step. A value off the step grid first snaps to the
 * nearest multiple in the step direction (1:40 + 15 s → 1:45). The result stays within the limits.
 */
export function stepValue(field: StepperField, value: number, direction: StepDirection): number {
  const { min, max, step } = STEPPER_LIMITS[field]
  const gridValue = direction === 1 ? Math.floor(value / step) * step : Math.ceil(value / step) * step
  return Math.min(max, Math.max(min, gridValue + direction * step))
}

export type StepperEntryError = 'roundCount' | 'duration' | 'rest'

export type StepperEntryResult = { ok: true; value: number } | { ok: false; error: StepperEntryError }

function readEntrySeconds(text: string): number | null {
  const clock = /^(\d+):([0-5]\d)$/.exec(text)
  if (clock) return Number(clock[1]) * 60 + Number(clock[2])
  return /^\d+$/.test(text) ? Number(text) : null
}

/** Reads a value typed after tapping a stepper: whole rounds, or time as m:ss or whole seconds. */
export function parseStepperEntry(field: StepperField, input: string): StepperEntryResult {
  const text = input.trim()
  const { min, max } = STEPPER_LIMITS[field]
  const value = field === 'roundCount' ? (/^\d+$/.test(text) ? Number(text) : null) : readEntrySeconds(text)
  if (value !== null && value >= min && value <= max) return { ok: true, value }
  return { ok: false, error: field === 'roundCount' ? 'roundCount' : field === 'rest' ? 'rest' : 'duration' }
}

export function canStep(field: StepperField, value: number, direction: StepDirection): boolean {
  const { min, max } = STEPPER_LIMITS[field]
  return direction === 1 ? value < max : value > min
}

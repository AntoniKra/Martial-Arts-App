import {
  parseStepperEntry,
  stepValue,
  type StepDirection,
} from '@/features/workout-builder/state/exerciseStepper'
import { DEFAULT_BREAK_DURATION_SECONDS } from '@/features/workout-builder/state/workoutBuilder.factories'
import { formatBreakDuration } from '@/features/workout-builder/utils/formatBreakDuration'

export { DEFAULT_BREAK_DURATION_SECONDS }

/** Quick-select break presets in one row (P1 A: 0:30 / 1:00 / 2:00 / 3:00). */
export const BREAK_DURATION_PRESETS = [30, 60, 120, 180] as const

/** Standalone break cap in the builder sheet (60:00); rest between rounds keeps STEPPER_LIMITS.rest. */
export const BREAK_DURATION_MAX_SECONDS = 3_600

export type BreakEntryError = 'rest' | 'zero'

export interface BreakEntryState {
  text: string
  invalid: boolean
  error: BreakEntryError | null
}

export type BreakEntryParseResult = { ok: true; value: number } | { ok: false }

export type BreakCommitResult =
  | { ok: true; durationSeconds: number }
  | { ok: false; entry: BreakEntryState }

export type BreakSubmitResult =
  | { ok: true; durationSeconds: number }
  | { ok: false; durationSeconds: number; entry: BreakEntryState }

export function normalizeBreakInstruction(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Parses a typed break duration (m:ss or seconds within 0:00–60:00). */
export function parseBreakEntry(input: string): BreakEntryParseResult {
  const parsed = parseStepperEntry('rest', input)
  if (!parsed.ok || parsed.value > BREAK_DURATION_MAX_SECONDS) return { ok: false }
  return { ok: true, value: parsed.value }
}

/** Parses a typed break duration and returns either the new seconds or an invalid entry state. */
export function commitBreakEntry(text: string): BreakCommitResult {
  const parsed = parseBreakEntry(text)
  if (!parsed.ok) {
    return { ok: false, entry: { text, invalid: true, error: 'rest' } }
  }
  return { ok: true, durationSeconds: parsed.value }
}

/**
 * Steps the break duration by 15 s within 0:00–60:00. If the user was editing the text field with a valid
 * value, applies that value first before stepping; otherwise steps from the current duration.
 */
export function stepBreakDuration(
  currentDurationSeconds: number,
  entry: BreakEntryState | null,
  direction: StepDirection,
): number {
  let base = currentDurationSeconds
  if (entry) {
    const parsed = parseBreakEntry(entry.text)
    if (parsed.ok) base = parsed.value
  }
  return Math.min(BREAK_DURATION_MAX_SECONDS, stepValue('rest', base, direction))
}

/** Validates the break duration before adding or saving (must be within 0:01–60:00). */
export function resolveBreakSubmit(
  currentDurationSeconds: number,
  entry: BreakEntryState | null,
): BreakSubmitResult {
  let resolved = currentDurationSeconds
  if (entry) {
    const parsed = parseBreakEntry(entry.text)
    if (!parsed.ok) {
      return {
        ok: false,
        durationSeconds: currentDurationSeconds,
        entry: { text: entry.text, invalid: true, error: 'rest' },
      }
    }
    resolved = parsed.value
  }

  if (resolved > BREAK_DURATION_MAX_SECONDS) {
    return {
      ok: false,
      durationSeconds: currentDurationSeconds,
      entry: { text: formatBreakDuration(resolved), invalid: true, error: 'rest' },
    }
  }

  if (resolved <= 0) {
    return {
      ok: false,
      durationSeconds: 0,
      entry: { text: entry ? entry.text : formatBreakDuration(0), invalid: true, error: 'zero' },
    }
  }

  return { ok: true, durationSeconds: resolved }
}

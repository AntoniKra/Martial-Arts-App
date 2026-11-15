import * as z from 'zod/mini'
import { DEFAULT_WORKOUT_END_WARNINGS, REST_WARNING_VALUES, ROUND_WARNING_VALUES, type WorkoutEndWarnings } from '@/domain/workout-playback/workoutEndWarning'

export const WORKOUT_END_WARNING_STORAGE_KEY = 'combat-training.endWarnings'
const legacyKey = 'combat-training.endWarningEnabled'

const schema = z.strictObject({ round: z.enum(ROUND_WARNING_VALUES), rest: z.enum(REST_WARNING_VALUES) })
const legacySchema = z.enum(['true', 'false'])
let useDefaultAfterWriteFailure = false

export function readStoredWorkoutEndWarnings(): WorkoutEndWarnings {
  if (useDefaultAfterWriteFailure) return { ...DEFAULT_WORKOUT_END_WARNINGS }
  try {
    const stored = localStorage.getItem(WORKOUT_END_WARNING_STORAGE_KEY)
    // Preserve an explicit opt-out from the previous single warning switch.
    if (stored === null) {
      const legacy = legacySchema.safeParse(localStorage.getItem(legacyKey))
      return { ...DEFAULT_WORKOUT_END_WARNINGS, round: legacy.success && legacy.data === 'false' ? 'off' : DEFAULT_WORKOUT_END_WARNINGS.round }
    }
    const result = schema.safeParse(JSON.parse(stored))
    return result.success ? result.data : { ...DEFAULT_WORKOUT_END_WARNINGS }
  } catch {
    return { ...DEFAULT_WORKOUT_END_WARNINGS }
  }
}

export function persistWorkoutEndWarnings(value: WorkoutEndWarnings): WorkoutEndWarnings {
  try {
    const parsed = schema.parse(value)
    localStorage.setItem(WORKOUT_END_WARNING_STORAGE_KEY, JSON.stringify(parsed))
    useDefaultAfterWriteFailure = false
    return parsed
  } catch {
    // Keep the setting and the next player consistent if an older value remains in storage.
    useDefaultAfterWriteFailure = true
    return { ...DEFAULT_WORKOUT_END_WARNINGS }
  }
}

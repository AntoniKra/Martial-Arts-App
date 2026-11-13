import * as z from 'zod/mini'

export const WORKOUT_END_WARNING_STORAGE_KEY = 'combat-training.endWarningEnabled'

const endWarningSchema = z.enum(['true', 'false'])
let useDefaultAfterWriteFailure = false

export function readStoredWorkoutEndWarning(): boolean {
  if (useDefaultAfterWriteFailure) return true
  try {
    const result = endWarningSchema.safeParse(localStorage.getItem(WORKOUT_END_WARNING_STORAGE_KEY))
    return result.success ? result.data === 'true' : true
  } catch {
    return true
  }
}

export function persistWorkoutEndWarning(enabled: boolean): boolean {
  try {
    localStorage.setItem(WORKOUT_END_WARNING_STORAGE_KEY, String(enabled))
    useDefaultAfterWriteFailure = false
    return enabled
  } catch {
    // Match the player's fallback even when an older preference remains in storage.
    useDefaultAfterWriteFailure = true
    return true
  }
}

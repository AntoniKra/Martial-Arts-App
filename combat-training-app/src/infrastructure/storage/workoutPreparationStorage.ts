import * as z from 'zod/mini'

import {
  WORKOUT_PREPARATION_DEFAULT,
  WORKOUT_PREPARATION_OPTIONS,
  type WorkoutPreparation,
} from '@/features/workout-player/workoutPreparation'

export const WORKOUT_PREPARATION_STORAGE_KEY = 'combat-training.preparationSeconds'

const preparationSchema = z.enum(WORKOUT_PREPARATION_OPTIONS.map(({ value }) => value))
let useDefaultAfterWriteFailure = false

export function readStoredWorkoutPreparation(): WorkoutPreparation {
  // Navigation to the player must use the same fallback as the setting after a failed write.
  if (useDefaultAfterWriteFailure) return WORKOUT_PREPARATION_DEFAULT

  try {
    const result = preparationSchema.safeParse(localStorage.getItem(WORKOUT_PREPARATION_STORAGE_KEY))
    return result.success ? result.data : WORKOUT_PREPARATION_DEFAULT
  } catch {
    return WORKOUT_PREPARATION_DEFAULT
  }
}

export function persistWorkoutPreparation(value: WorkoutPreparation): WorkoutPreparation {
  try {
    localStorage.setItem(WORKOUT_PREPARATION_STORAGE_KEY, value)
    useDefaultAfterWriteFailure = false
    return value
  } catch {
    // Keep the selection consistent with the default used when storage is unavailable.
    useDefaultAfterWriteFailure = true
    return WORKOUT_PREPARATION_DEFAULT
  }
}

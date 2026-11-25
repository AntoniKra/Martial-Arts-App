import type { ExerciseType, PersonalExercise } from '@/domain/exercise/exercise'
import { EXERCISE_LIBRARY_FIXTURES } from '@/features/workout-builder/data/exerciseLibraryFixtures'

/** Exercise type shown on the exercise screen: from the built-in library, My exercises, or the custom form. */
export function resolveExerciseType({ combinationId, personalExercises, customType }: {
  combinationId: string | null
  personalExercises: readonly PersonalExercise[]
  customType?: ExerciseType
}): ExerciseType | null {
  if (combinationId !== null) {
    const source = EXERCISE_LIBRARY_FIXTURES.find((item) => item.id === combinationId)
      ?? personalExercises.find((item) => item.id === combinationId)
    if (source) return source.type
  }
  return customType ?? null
}

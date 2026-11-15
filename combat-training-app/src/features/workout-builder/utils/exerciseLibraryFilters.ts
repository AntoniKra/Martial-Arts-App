import type { Combination } from '@/domain/combination/combination.types'
import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { WorkoutBlockType } from '@/domain/workout/workout.types'
import { normalizeExerciseSearch } from '@/domain/exercise/exercise'

export function normalizeSearchText(value: string): string {
  return normalizeExerciseSearch(value)
}

export function filterExerciseLibrary(
  combinations: readonly Combination[],
  disciplineKey: DisciplineKey | null,
  blockType: WorkoutBlockType | null,
  searchQuery: string,
  category = '',
): Combination[] {
  const normalizedQuery = normalizeSearchText(searchQuery)

  return combinations.filter((combination) => {
    if (!combination.isActive) {
      return false
    }

    if (disciplineKey !== null && !combination.disciplineKeys.includes(disciplineKey)) {
      return false
    }

    if (blockType !== null && !combination.blockTypes.includes(blockType)) {
      return false
    }

    if (category && combination.category !== category) {
      return false
    }

    if (normalizedQuery.length === 0) {
      return true
    }

    return normalizeSearchText(combination.namePl).includes(normalizedQuery)
  })
}

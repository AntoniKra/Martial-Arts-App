import type { Combination } from '@/domain/combination/combination.types'
import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { WorkoutBlockType } from '@/domain/workout/workout.types'

export function normalizeSearchText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function filterExerciseLibrary(
  combinations: readonly Combination[],
  disciplineKey: DisciplineKey,
  blockType: WorkoutBlockType,
  searchQuery: string,
): Combination[] {
  const normalizedQuery = normalizeSearchText(searchQuery)

  return combinations.filter((combination) => {
    if (!combination.isActive) {
      return false
    }

    if (!combination.disciplineKeys.includes(disciplineKey)) {
      return false
    }

    if (!combination.blockTypes.includes(blockType)) {
      return false
    }

    if (normalizedQuery.length === 0) {
      return true
    }

    return normalizeSearchText(combination.namePl).includes(normalizedQuery)
  })
}

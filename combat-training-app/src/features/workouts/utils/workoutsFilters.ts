import type {
  WorkoutHistoryListItem,
  WorkoutPlanListItem,
  WorkoutsDisciplineFilter,
  WorkoutsFilterState,
  WorkoutsSortOrder,
} from '@/features/workouts/types/workoutsView.types'

export const DEFAULT_WORKOUTS_FILTERS: WorkoutsFilterState = {
  searchQuery: '',
  discipline: 'all',
  sortOrder: 'newest',
}

export const WORKOUTS_DISCIPLINE_FILTER_OPTIONS = [
  { value: 'all', labelPl: 'Wszystkie' },
  { value: 'boxing', labelPl: 'Boks' },
  { value: 'kickboxing', labelPl: 'Kickboxing' },
  { value: 'muay_thai', labelPl: 'Muay Thai' },
  { value: 'k1', labelPl: 'K-1' },
  { value: 'mma_striking', labelPl: 'MMA stójka' },
] as const satisfies readonly { value: WorkoutsDisciplineFilter; labelPl: string }[]

export const WORKOUTS_SORT_OPTIONS = [
  { value: 'newest', labelPl: 'Najnowsze' },
  { value: 'oldest', labelPl: 'Najstarsze' },
] as const satisfies readonly { value: WorkoutsSortOrder; labelPl: string }[]

export function normalizeSearchText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase()
}

function matchesDiscipline(item: { disciplineKey: string }, discipline: WorkoutsDisciplineFilter): boolean {
  return discipline === 'all' || item.disciplineKey === discipline
}

function matchesSearch(name: string, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true
  return normalizeSearchText(name).includes(normalizedQuery)
}

function sortByCreatedAt(
  plans: readonly WorkoutPlanListItem[],
  sortOrder: WorkoutsSortOrder,
): WorkoutPlanListItem[] {
  const sorted = [...plans].sort((left, right) => left.createdAt.localeCompare(right.createdAt))
  return sortOrder === 'newest' ? sorted.reverse() : sorted
}

function sortByCompletedAt(
  history: readonly WorkoutHistoryListItem[],
  sortOrder: WorkoutsSortOrder,
): WorkoutHistoryListItem[] {
  const sorted = [...history].sort((left, right) => left.completedAt.localeCompare(right.completedAt))
  return sortOrder === 'newest' ? sorted.reverse() : sorted
}

export function filterWorkoutPlans(
  plans: readonly WorkoutPlanListItem[],
  filters: WorkoutsFilterState,
): WorkoutPlanListItem[] {
  const normalizedQuery = normalizeSearchText(filters.searchQuery)

  const filtered = plans.filter(
    (plan) => matchesDiscipline(plan, filters.discipline) && matchesSearch(plan.name, normalizedQuery),
  )

  return sortByCreatedAt(filtered, filters.sortOrder)
}

export function filterWorkoutHistory(
  history: readonly WorkoutHistoryListItem[],
  filters: WorkoutsFilterState,
): WorkoutHistoryListItem[] {
  const normalizedQuery = normalizeSearchText(filters.searchQuery)

  const filtered = history.filter(
    (session) =>
      matchesDiscipline(session, filters.discipline) && matchesSearch(session.name, normalizedQuery),
  )

  return sortByCompletedAt(filtered, filters.sortOrder)
}

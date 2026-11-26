import type { Combination } from '@/domain/combination/combination.types'
import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { WorkoutBlockType } from '@/domain/workout/workout.types'
import { normalizeExerciseSearch, selectExerciseSections, type PersonalExercise } from '@/domain/exercise/exercise'

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

/** Builds the personal copy created by starring a builtin exercise (ADR 0017: copies keep `copiedFromId`). */
export function copyBuiltinAsFavorite(combination: Combination, id: string, at: string): PersonalExercise {
  return {
    id, namePl: combination.namePl, type: combination.type,
    disciplines: [...combination.disciplineKeys], blockTypes: [...combination.blockTypes],
    defaultConfiguration: { ...combination.defaultConfiguration },
    copiedFromId: combination.id, favorite: true, archivedAt: null, lastUsedAt: null, createdAt: at, updatedAt: at,
  }
}

function activeCopiesOf(builtinId: string, exercises: readonly PersonalExercise[]): PersonalExercise[] {
  return exercises.filter((exercise) => exercise.archivedAt === null && exercise.copiedFromId === builtinId)
}

/** The star on a builtin row is filled when an active copy of it is a favourite (#267). */
export function isBuiltinFavorite(builtinId: string, exercises: readonly PersonalExercise[]): boolean {
  return activeCopiesOf(builtinId, exercises).some((exercise) => exercise.favorite)
}

export type BuiltinFavoriteToggle =
  | { type: 'copy' }
  | { type: 'setFavorite'; ids: string[]; favorite: boolean }

/** Decides what tapping the star on a builtin row does; un-starring keeps the copy. */
export function planBuiltinFavoriteToggle(builtinId: string, exercises: readonly PersonalExercise[]): BuiltinFavoriteToggle {
  const copies = activeCopiesOf(builtinId, exercises)
  const favorites = copies.filter((exercise) => exercise.favorite)
  if (favorites.length > 0) return { type: 'setFavorite', ids: favorites.map((exercise) => exercise.id), favorite: false }
  const [oldest] = [...copies].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  return oldest ? { type: 'setFavorite', ids: [oldest.id], favorite: true } : { type: 'copy' }
}

/** Library filters: plan-context discipline and block type, "Moje" only, and one builtin category ('' = all). */
export interface ExerciseLibraryFilters {
  discipline: boolean
  blockType: boolean
  mine: boolean
  category: string
}

/** Number on the filter button: the switches inside the drawer (the category row is visible on screen). */
export function countActiveLibraryFilters(filters: ExerciseLibraryFilters): number {
  return [filters.discipline, filters.blockType, filters.mine].filter(Boolean).length
}

export function hasActiveLibraryFilters(filters: ExerciseLibraryFilters): boolean {
  return countActiveLibraryFilters(filters) > 0 || filters.category !== ''
}

export function clearLibraryFilters(): ExerciseLibraryFilters {
  return { discipline: false, blockType: false, mine: false, category: '' }
}

export type ExerciseLibraryRow =
  | { kind: 'builtin'; exercise: Combination }
  | { kind: 'personal'; exercise: PersonalExercise }

/** A collapsible group; `category: null` holds personal exercises that are not copies of a builtin. */
export interface ExerciseLibraryCategorySection {
  key: string
  category: string | null
  rows: ExerciseLibraryRow[]
}

export interface ExerciseLibrarySections {
  recent: PersonalExercise[]
  favorites: PersonalExercise[]
  categories: ExerciseLibraryCategorySection[]
}

export interface ExerciseLibrarySectionsInput {
  builtins: readonly Combination[]
  exercises: readonly PersonalExercise[]
  disciplineKey: DisciplineKey
  blockType: WorkoutBlockType
  filters: ExerciseLibraryFilters
  searchQuery: string
}

/**
 * Sections of the "Dodaj ćwiczenie" library (#267, L4 C). Recent and favourite personal exercises come first and only
 * without a search phrase or category; each exercise then appears once. A visible personal copy of a builtin takes the
 * builtin's place in its category, so a copied exercise never appears twice in the same section.
 */
function libraryCategoryOrder(builtins: readonly Combination[]): Map<string, number> {
  const order = new Map<string, number>()
  for (const exercise of builtins) if (!order.has(exercise.category)) order.set(exercise.category, order.size)
  return order
}

/** Category row (L2 B): categories that fit the plan context in library order, plus the chosen one if it no longer fits. */
export function listLibraryCategories(input: Omit<ExerciseLibrarySectionsInput, 'exercises' | 'searchQuery'>): string[] {
  const { filters } = input
  const available = filterExerciseLibrary(input.builtins, filters.discipline ? input.disciplineKey : null, filters.blockType ? input.blockType : null, '')
  return [...new Set([...available.map((exercise) => exercise.category), ...(filters.category ? [filters.category] : [])])]
}

export function selectExerciseLibrarySections(input: ExerciseLibrarySectionsInput): ExerciseLibrarySections {
  const { builtins, filters } = input
  const query = normalizeSearchText(input.searchQuery)
  const fitsContext = (disciplines: readonly DisciplineKey[], blockTypes: readonly WorkoutBlockType[]) =>
    (!filters.discipline || disciplines.includes(input.disciplineKey)) && (!filters.blockType || blockTypes.includes(input.blockType))
  const libraryIndex = new Map(builtins.map((exercise, index) => [exercise.id, index]))
  const sourceCategory = (exercise: PersonalExercise) => {
    const index = exercise.copiedFromId === undefined ? undefined : libraryIndex.get(exercise.copiedFromId)
    return index === undefined ? null : builtins[index].category
  }
  const personal = input.exercises.filter((exercise) => exercise.archivedAt === null
    && fitsContext(exercise.disciplines, exercise.blockTypes) && normalizeSearchText(exercise.namePl).includes(query)
    && (filters.category === '' || sourceCategory(exercise) === filters.category))
  const sections = selectExerciseSections(personal)
  const showsTop = query === '' && filters.category === ''
  const recent = showsTop ? sections.recent : []
  const favorites = showsTop ? sections.favorites.filter((exercise) => !recent.includes(exercise)) : []
  const onTop = new Set([...recent, ...favorites])
  const copiedIds = new Set(personal.map((exercise) => exercise.copiedFromId))
  const visibleBuiltins = filters.mine ? [] : filterExerciseLibrary(builtins, filters.discipline ? input.disciplineKey : null,
    filters.blockType ? input.blockType : null, input.searchQuery, filters.category).filter((exercise) => !copiedIds.has(exercise.id))

  const own: ExerciseLibraryRow[] = []
  const groups = new Map<string, { order: number; row: ExerciseLibraryRow }[]>()
  const add = (category: string, order: number, row: ExerciseLibraryRow) => groups.set(category, [...(groups.get(category) ?? []), { order, row }])
  for (const exercise of visibleBuiltins) add(exercise.category, libraryIndex.get(exercise.id) ?? 0, { kind: 'builtin', exercise })
  for (const exercise of sections.all) {
    if (onTop.has(exercise)) continue
    const category = sourceCategory(exercise)
    const row: ExerciseLibraryRow = { kind: 'personal', exercise }
    if (category === null) own.push(row)
    else add(category, libraryIndex.get(exercise.copiedFromId ?? '') ?? 0, row)
  }
  const categoryOrder = libraryCategoryOrder(builtins)
  const categories: ExerciseLibraryCategorySection[] = [...groups.keys()]
    .sort((a, b) => (categoryOrder.get(a) ?? 0) - (categoryOrder.get(b) ?? 0)).map((category) => ({
    key: `category:${category}`, category,
    rows: [...(groups.get(category) ?? [])].sort((a, b) => a.order - b.order).map((entry) => entry.row),
  }))
  return { recent, favorites, categories: own.length > 0 ? [{ key: 'personal', category: null, rows: own }, ...categories] : categories }
}

/** L4 C: the first category starts open; while searching every listed category has results and starts open. */
export function isLibraryCategoryExpanded(index: number, searching: boolean, override?: boolean): boolean {
  return override ?? (searching || index === 0)
}

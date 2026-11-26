import { describe, expect, it } from 'vitest'

import type { Combination } from '@/domain/combination/combination.types'
import type { PersonalExercise } from '@/domain/exercise/exercise'
import { clearLibraryFilters, copyBuiltinAsFavorite, countActiveLibraryFilters, hasActiveLibraryFilters, isBuiltinFavorite, isLibraryCategoryExpanded, planBuiltinFavoriteToggle, selectExerciseLibrarySections } from '@/features/workout-builder/utils/exerciseLibraryFilters'

const AT = '2026-11-26T10:00:00.000Z'

function builtin(overrides: Partial<Combination> = {}): Combination {
  return {
    id: 'combo-jab-cross', combinationKey: 'jab-cross', namePl: 'Lewy prosty → prawy prosty', nameEn: null,
    type: 'combination', category: 'Kombinacje 2-ciosowe',
    defaultConfiguration: { mode: 'rounds', roundCount: 3, roundDurationSeconds: 180, restBetweenRoundsSeconds: 60 },
    disciplineKeys: ['boxing', 'kickboxing'], blockTypes: ['technique', 'pads'], isSystem: true, isActive: true,
    ...overrides,
  }
}

function personal(overrides: Partial<PersonalExercise> = {}): PersonalExercise {
  return {
    id: 'mine-1', namePl: 'Moja kombinacja', type: 'combination', blockTypes: ['technique'], disciplines: ['boxing'],
    defaultConfiguration: { mode: 'rounds', roundCount: 3, roundDurationSeconds: 180, restBetweenRoundsSeconds: 60 },
    archivedAt: null, favorite: false, lastUsedAt: null, createdAt: AT, updatedAt: AT,
    ...overrides,
  }
}

describe('copyBuiltinAsFavorite', () => {
  it('creates a favourite personal copy that remembers its builtin source', () => {
    expect(copyBuiltinAsFavorite(builtin(), 'copy-1', AT)).toEqual({
      id: 'copy-1', namePl: 'Lewy prosty → prawy prosty', type: 'combination',
      disciplines: ['boxing', 'kickboxing'], blockTypes: ['technique', 'pads'],
      defaultConfiguration: { mode: 'rounds', roundCount: 3, roundDurationSeconds: 180, restBetweenRoundsSeconds: 60 },
      copiedFromId: 'combo-jab-cross', favorite: true, archivedAt: null, lastUsedAt: null, createdAt: AT, updatedAt: AT,
    })
  })

  it('does not share mutable lists with the builtin library', () => {
    const source = builtin()
    const copy = copyBuiltinAsFavorite(source, 'copy-1', AT)
    copy.disciplines.push('k1')
    expect(source.disciplineKeys).toEqual(['boxing', 'kickboxing'])
  })
})


describe('builtin favourite star', () => {
  const source = 'combo-jab-cross'

  it('is filled only by an active favourite copy of that builtin', () => {
    expect(isBuiltinFavorite(source, [])).toBe(false)
    expect(isBuiltinFavorite(source, [personal({ copiedFromId: source, favorite: false })])).toBe(false)
    expect(isBuiltinFavorite(source, [personal({ copiedFromId: source, favorite: true, archivedAt: AT })])).toBe(false)
    expect(isBuiltinFavorite(source, [personal({ copiedFromId: 'combo-other', favorite: true })])).toBe(false)
    expect(isBuiltinFavorite(source, [personal({ favorite: true })])).toBe(false)
    expect(isBuiltinFavorite(source, [personal({ copiedFromId: source, favorite: true })])).toBe(true)
  })

  it('copies the builtin when there is no active copy yet', () => {
    expect(planBuiltinFavoriteToggle(source, [])).toEqual({ type: 'copy' })
    expect(planBuiltinFavoriteToggle(source, [personal({ copiedFromId: source, archivedAt: AT, favorite: true })])).toEqual({ type: 'copy' })
  })

  it('marks the oldest existing active copy as favourite instead of copying again', () => {
    const copies = [
      personal({ id: 'newer', copiedFromId: source, createdAt: '2026-11-20T00:00:00.000Z' }),
      personal({ id: 'older', copiedFromId: source, createdAt: '2026-11-10T00:00:00.000Z' }),
    ]
    expect(planBuiltinFavoriteToggle(source, copies)).toEqual({ type: 'setFavorite', ids: ['older'], favorite: true })
  })

  it('removes the favourite from every favourite copy and never deletes the copy', () => {
    const copies = [
      personal({ id: 'a', copiedFromId: source, favorite: true }),
      personal({ id: 'b', copiedFromId: source, favorite: false }),
      personal({ id: 'c', copiedFromId: source, favorite: true }),
    ]
    expect(planBuiltinFavoriteToggle(source, copies)).toEqual({ type: 'setFavorite', ids: ['a', 'c'], favorite: false })
  })
})

describe('library filters', () => {
  const none = { discipline: false, blockType: false, mine: false, category: '' }

  it('counts the drawer filters shown on the filter button', () => {
    expect(countActiveLibraryFilters(none)).toBe(0)
    expect(countActiveLibraryFilters({ ...none, discipline: true, blockType: true })).toBe(2)
    expect(countActiveLibraryFilters({ discipline: true, blockType: true, mine: true, category: 'Kolana' })).toBe(3)
  })

  it('treats a chosen category as an active filter that can be cleared', () => {
    expect(hasActiveLibraryFilters(none)).toBe(false)
    expect(hasActiveLibraryFilters({ ...none, category: 'Kolana' })).toBe(true)
    expect(hasActiveLibraryFilters({ ...none, mine: true })).toBe(true)
    expect(hasActiveLibraryFilters(clearLibraryFilters())).toBe(false)
  })
})

describe('selectExerciseLibrarySections', () => {
  const context = { disciplineKey: 'boxing', blockType: 'technique' } as const
  const contextFilters = { discipline: true, blockType: true, mine: false, category: '' }
  const jabCross = builtin()
  const jabCrossHook = builtin({ id: 'combo-jab-cross-hook', namePl: 'Lewy prosty → prawy prosty → lewy sierp', category: 'Kombinacje 3-ciosowe' })
  const crossHook = builtin({ id: 'combo-cross-hook', namePl: 'Prawy prosty → lewy sierp', category: 'Kombinacje 2-ciosowe' })
  const lowKick = builtin({ id: 'combo-low-kick', namePl: 'Prawy low kick', category: 'Kopnięcia', disciplineKeys: ['muay_thai'] })
  const footwork = builtin({ id: 'drill-footwork', namePl: 'Krok w przód → krok w tył', type: 'drill', category: 'Postawa i poruszanie się' })
  const library = [jabCross, jabCrossHook, crossHook, lowKick, footwork]
  const select = (overrides: Partial<Parameters<typeof selectExerciseLibrarySections>[0]> = {}) =>
    selectExerciseLibrarySections({ builtins: library, exercises: [], ...context, filters: contextFilters, searchQuery: '', ...overrides })
  const names = (result: ReturnType<typeof select>) =>
    result.categories.map((section) => [section.category, section.rows.map((row) => row.exercise.namePl)])

  it('groups the builtins that fit the plan context into alphabetical categories in library order', () => {
    expect(names(select())).toEqual([
      ['Kombinacje 2-ciosowe', ['Lewy prosty → prawy prosty', 'Prawy prosty → lewy sierp']],
      ['Kombinacje 3-ciosowe', ['Lewy prosty → prawy prosty → lewy sierp']],
      ['Postawa i poruszanie się', ['Krok w przód → krok w tył']],
    ])
    expect(names(select({ filters: { ...contextFilters, discipline: false } })).map(([category]) => category)).toContain('Kopnięcia')
  })

  it('shows recent and favourite personal exercises on top, each exercise in one section only', () => {
    const recent = personal({ id: 'recent', namePl: 'Zmiana gardy', lastUsedAt: AT, favorite: true })
    const favorite = personal({ id: 'favorite', namePl: 'Balans', favorite: true })
    const other = personal({ id: 'other', namePl: 'Akcent na korpus' })
    const archived = personal({ id: 'archived', namePl: 'Stare', favorite: true, archivedAt: AT })
    const result = select({ exercises: [recent, favorite, other, archived] })
    expect(result.recent.map((exercise) => exercise.id)).toEqual(['recent'])
    expect(result.favorites.map((exercise) => exercise.id)).toEqual(['favorite'])
    expect(names(result)[0]).toEqual([null, ['Akcent na korpus']])
  })

  it('applies the plan-context filters to personal exercises', () => {
    const kickboxing = personal({ id: 'kb', namePl: 'Kopnięcie', disciplines: ['kickboxing'], favorite: true })
    expect(select({ exercises: [kickboxing] }).favorites).toEqual([])
    expect(select({ exercises: [kickboxing], filters: { ...contextFilters, discipline: false } }).favorites).toEqual([kickboxing])
  })

  it('shows a visible copy in place of its builtin, in the builtin category', () => {
    const copy = personal({ id: 'copy', namePl: 'Mój prosty', copiedFromId: 'combo-cross-hook' })
    expect(names(select({ exercises: [copy] }))[0]).toEqual(['Kombinacje 2-ciosowe', ['Lewy prosty → prawy prosty', 'Mój prosty']])
  })

  it('never repeats a starred builtin below the favourites', () => {
    const copy = copyBuiltinAsFavorite(jabCross, 'copy', AT)
    const result = select({ exercises: [copy] })
    expect(result.favorites).toEqual([copy])
    expect(names(result)[0]).toEqual(['Kombinacje 2-ciosowe', ['Prawy prosty → lewy sierp']])
  })

  it('keeps the builtin row when its copy does not fit the filters, so the star still reflects the copy', () => {
    const copy = { ...copyBuiltinAsFavorite(jabCross, 'copy', AT), disciplines: ['muay_thai' as const], favorite: false }
    const [section] = select({ exercises: [copy] }).categories
    expect(section.rows.map((row) => row.kind)).toEqual(['builtin', 'builtin'])
  })

  it('while searching, hides the top sections and lists only categories with matches, ignoring Polish marks', () => {
    const favorite = personal({ id: 'favorite', namePl: 'Sierp z doskoku', favorite: true, lastUsedAt: AT })
    const result = select({ exercises: [favorite], searchQuery: 'SIERP' })
    expect(result.recent).toEqual([])
    expect(result.favorites).toEqual([])
    expect(names(result)).toEqual([
      [null, ['Sierp z doskoku']],
      ['Kombinacje 2-ciosowe', ['Prawy prosty → lewy sierp']],
      ['Kombinacje 3-ciosowe', ['Lewy prosty → prawy prosty → lewy sierp']],
    ])
    expect(names(select({ searchQuery: 'krok w przod' }))).toEqual([['Postawa i poruszanie się', ['Krok w przód → krok w tył']]])
  })

  it('limits the list to one category, which keeps copies of its builtins but not other personal exercises', () => {
    const copy = personal({ id: 'copy', namePl: 'Mój sierp', copiedFromId: 'combo-jab-cross-hook', favorite: true })
    const own = personal({ id: 'own', namePl: 'Własne', favorite: true })
    const result = select({ exercises: [copy, own], filters: { ...contextFilters, category: 'Kombinacje 3-ciosowe' } })
    expect(result.favorites).toEqual([])
    expect(names(result)).toEqual([['Kombinacje 3-ciosowe', ['Mój sierp']]])
  })

  it('shows only personal exercises with the "Moje" filter', () => {
    const copy = personal({ id: 'copy', namePl: 'Mój prosty', copiedFromId: 'combo-jab-cross' })
    const own = personal({ id: 'own', namePl: 'Własne' })
    expect(names(select({ exercises: [copy, own], filters: { ...contextFilters, mine: true } }))).toEqual([
      [null, ['Własne']],
      ['Kombinacje 2-ciosowe', ['Mój prosty']],
    ])
  })

  it('is empty when nothing matches', () => {
    expect(select({ searchQuery: 'hak z obrotu' })).toEqual({ recent: [], favorites: [], categories: [] })
  })
})

describe('isLibraryCategoryExpanded', () => {
  it('expands only the first category by default and every category with results while searching', () => {
    expect([0, 1, 2].map((index) => isLibraryCategoryExpanded(index, false))).toEqual([true, false, false])
    expect([0, 1, 2].map((index) => isLibraryCategoryExpanded(index, true))).toEqual([true, true, true])
  })

  it('lets the athlete open or close a category', () => {
    expect(isLibraryCategoryExpanded(0, false, false)).toBe(false)
    expect(isLibraryCategoryExpanded(2, false, true)).toBe(true)
    expect(isLibraryCategoryExpanded(2, true, false)).toBe(false)
  })
})

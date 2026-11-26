import { useId, useRef, useState, type FormEvent } from 'react'
import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { screenHeaderLabels } from '@/components/screenHeaderLabels'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Switch } from '@/components/ui/Switch'
import { getDisciplineLabelPl } from '@/domain/discipline/disciplineLabels'
import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import { EXERCISE_TYPES, type PersonalExercise } from '@/domain/exercise/exercise'
import type { Combination } from '@/domain/combination/combination.types'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import type { WorkoutBlockType } from '@/domain/workout/workout.types'
import { exerciseLabels as labels } from '@/features/exercises/exerciseLabels'
import { EXERCISE_LIBRARY_FIXTURES } from '@/features/workout-builder/data/exerciseLibraryFixtures'
import {
  clearLibraryFilters, copyBuiltinAsFavorite, countActiveLibraryFilters, hasActiveLibraryFilters, listLibraryCategories,
  isBuiltinFavorite, isLibraryCategoryExpanded, planBuiltinFavoriteToggle, selectExerciseLibrarySections,
  type ExerciseLibraryFilters, type ExerciseLibraryRow,
} from '@/features/workout-builder/utils/exerciseLibraryFilters'
import type { ExerciseLibraryUiState, ExerciseSelection } from './workoutBuilderUi.types'
import './exerciseConfiguration.css'
import './exerciseLibrary.css'

interface ExerciseLibraryViewProps {
  blockType: WorkoutBlockType; disciplineKey: DisciplineKey
  libraryUiState: ExerciseLibraryUiState
  onLibraryUiStateChange: (nextState: ExerciseLibraryUiState) => void
  onBack: () => void; onConfigure: (selection: ExerciseSelection) => void
}

const disciplineTextColors: Record<DisciplineKey, string> = {
  boxing: 'text-discipline-boxing',
  kickboxing: 'text-discipline-kickboxing',
  muay_thai: 'text-discipline-muay-thai',
  k1: 'text-discipline-k1',
  mma_striking: 'text-discipline-mma-striking',
}

function SearchIcon({ size, minus = false }: { size: number; minus?: boolean }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />{minus && <line x1="8" y1="11" x2="14" y2="11" />}
  </svg>
}

function FavoriteStar({ name, favorite, disabled, onToggle }: { name: string; favorite: boolean; disabled: boolean; onToggle: () => void }) {
  return <button type="button" className="exercise-library-star" data-favorite={favorite || undefined} disabled={disabled} aria-pressed={favorite}
    aria-label={favorite ? labels.unfavorite(name) : labels.favorite(name)} onClick={onToggle}>
    <span aria-hidden="true">{favorite ? '★' : '☆'}</span>
  </button>
}

export function ExerciseLibraryView({ blockType, disciplineKey, libraryUiState, onLibraryUiStateChange, onBack, onConfigure }: ExerciseLibraryViewProps) {
  const { exercises, exerciseRepository, retryExercises } = useWorkoutData()
  const id = useId()
  const customName = useRef<HTMLInputElement>(null)
  const drawer = useRef<HTMLDialogElement>(null)
  const drawerTrigger = useRef<HTMLButtonElement>(null)
  const [toggles, setToggles] = useState({ discipline: true, blockType: true, mine: false })
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const ready = exercises.status === 'ready' && exercises.invalidDocumentIds.length === 0
  const filters: ExerciseLibraryFilters = { ...toggles, category: libraryUiState.category ?? '' }
  const searchQuery = libraryUiState.searchQuery
  const searching = searchQuery.trim() !== ''
  const activeFilterCount = countActiveLibraryFilters(filters)
  const personalItems = exercises.status === 'ready' ? exercises.items : []
  const sections = selectExerciseLibrarySections({
    builtins: EXERCISE_LIBRARY_FIXTURES, exercises: personalItems, disciplineKey, blockType, filters, searchQuery,
  })
  const categories = listLibraryCategories({ builtins: EXERCISE_LIBRARY_FIXTURES, disciplineKey, blockType, filters })
  const empty = sections.recent.length + sections.favorites.length + sections.categories.length === 0
  const phrase = searchQuery.trim().slice(0, 100)
  const saveToLibrary = libraryUiState.saveToLibrary !== false

  function updateFilters(next: ExerciseLibraryFilters) {
    setToggles({ discipline: next.discipline, blockType: next.blockType, mine: next.mine })
    setExpanded({})
    if (next.category !== filters.category) onLibraryUiStateChange({ ...libraryUiState, category: next.category })
  }
  function updateSearch(value: string) {
    setExpanded({})
    onLibraryUiStateChange({ ...libraryUiState, searchQuery: value })
  }
  function configureCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = libraryUiState.customName.trim()
    if (!name || name.length > 100) { setError(labels.invalidName); customName.current?.focus(); return }
    setError(null)
    onConfigure({ type: 'custom', exerciseNameSnapshot: name, saveToLibrary,
      exerciseType: libraryUiState.exerciseType ?? 'drill', personalId: crypto.randomUUID() })
  }
  async function runFavoriteChange(change: () => Promise<unknown>) {
    if (inFlight.current) return
    inFlight.current = true; setBusy(true); setError(null)
    try { await change() } catch { setError(labels.error) } finally { inFlight.current = false; setBusy(false) }
  }
  function toggleBuiltinFavorite(combination: Combination) {
    void runFavoriteChange(async () => {
      const at = new Date().toISOString()
      const plan = planBuiltinFavoriteToggle(combination.id, personalItems)
      if (plan.type === 'copy') await exerciseRepository.save(copyBuiltinAsFavorite(combination, crypto.randomUUID(), at))
      else await Promise.all(plan.ids.map((exerciseId) => exerciseRepository.setFavorite(exerciseId, plan.favorite, at)))
    })
  }

  function row(entry: ExerciseLibraryRow) {
    if (entry.kind === 'builtin') {
      const exercise = entry.exercise
      return <li key={exercise.id} className="exercise-library-row">
        <button type="button" className="exercise-library-pick"
          onClick={() => onConfigure({ type: 'library', combinationId: exercise.id, exerciseNameSnapshot: exercise.namePl })}>
          <span className="exercise-library-name">{exercise.namePl}</span>
        </button>
        <FavoriteStar name={exercise.namePl} favorite={isBuiltinFavorite(exercise.id, personalItems)} disabled={busy || !ready}
          onToggle={() => toggleBuiltinFavorite(exercise)} />
      </li>
    }
    return personalRow(entry.exercise)
  }
  function personalRow(exercise: PersonalExercise) {
    return <li key={exercise.id} className="exercise-library-row">
      <button type="button" className="exercise-library-pick"
        onClick={() => onConfigure({ type: 'library', combinationId: exercise.id, exerciseNameSnapshot: exercise.namePl, defaultConfiguration: exercise.defaultConfiguration })}>
        <span className="exercise-library-name">{exercise.namePl}</span>
        {exercises.pendingIds.has(exercise.id) && <span className="exercise-library-sub">{workoutDataLabels.pending}</span>}
      </button>
      <FavoriteStar name={exercise.namePl} favorite={exercise.favorite} disabled={busy} onToggle={() => void runFavoriteChange(() =>
        exerciseRepository.setFavorite(exercise.id, !exercise.favorite, new Date().toISOString()))} />
    </li>
  }
  function topSection(title: string, items: PersonalExercise[]) {
    if (items.length === 0) return null
    return <section aria-label={title} className="exercise-library-section">
      <h2 className="exercise-library-section-title"><span>{title}</span><span className="exercise-library-section-count">{items.length}</span></h2>
      <ul className="exercise-library-list">{items.map(personalRow)}</ul>
    </section>
  }

  const library = <>
    <div className="exercise-library-search-block">
      <div className="exercise-library-search-row">
        <div className="exercise-library-search">
          <span className="exercise-library-search-icon"><SearchIcon size={18} /></span>
          <input id={`${id}-search`} type="search" aria-label={labels.search} value={searchQuery} placeholder={labels.searchPlaceholder}
            className="exercise-library-search-input" onChange={(event) => updateSearch(event.target.value)} />
          {searchQuery && <button type="button" className="exercise-library-search-clear" aria-label={labels.clearSearch} onClick={() => updateSearch('')}>
            <span aria-hidden="true">✕</span>
          </button>}
        </div>
        <button ref={drawerTrigger} type="button" className="exercise-library-filter-button" aria-haspopup="dialog" aria-label={labels.filters(activeFilterCount)}
          onClick={() => { drawer.current?.showModal(); drawer.current?.querySelector<HTMLButtonElement>('button')?.focus() }}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
          {activeFilterCount > 0 && <span aria-hidden="true" className="exercise-library-filter-count">{activeFilterCount}</span>}
        </button>
      </div>
      <div className="exercise-library-categories" role="group" aria-label={labels.categories}>
        {['', ...categories].map((category) => <button key={category || 'all'} type="button" className="exercise-library-category" aria-pressed={filters.category === category}
          onClick={() => updateFilters({ ...filters, category })}>{category || labels.allCategoriesShort}</button>)}
      </div>
    </div>
    {empty ? <div className="exercise-library-empty">
      <span className="exercise-library-empty-icon"><SearchIcon size={24} minus /></span>
      <p className="exercise-library-empty-text">{labels.noResults}</p>
      {phrase && <button type="button" className="exercise-library-create" disabled={!ready} onClick={() => onLibraryUiStateChange({ ...libraryUiState,
        tab: 'custom', customName: phrase, saveToLibrary: true })}>{labels.createFromSearch(phrase)}</button>}
      {hasActiveLibraryFilters(filters) && <button type="button" className="exercise-library-clear" onClick={() => updateFilters(clearLibraryFilters())}>{labels.clearFilters}</button>}
    </div> : <div className="exercise-library-sections">
      {topSection(labels.recent, sections.recent)}
      {topSection(labels.favorites, sections.favorites)}
      {sections.categories.length > 0 && <div className="exercise-library-accordions">
        {sections.categories.map((section, index) => {
          const open = isLibraryCategoryExpanded(index, searching, expanded[section.key])
          const title = section.category ?? labels.title
          const contentId = `${id}-category-${index}`
          return <section key={section.key} aria-label={title} className="exercise-library-accordion" data-expanded={open || undefined}>
            <h2 className="m-0">
              <button type="button" className="exercise-library-accordion-header" aria-expanded={open} aria-controls={contentId}
                onClick={() => setExpanded({ ...expanded, [section.key]: !open })}>
                <span className="exercise-library-accordion-title"><span>{title}</span><span className="exercise-library-accordion-count">({section.rows.length})</span></span>
                <span aria-hidden="true" className="exercise-library-chevron">▼</span>
              </button>
            </h2>
            <ul id={contentId} hidden={!open} className="exercise-library-accordion-content">{section.rows.map(row)}</ul>
          </section>
        })}
      </div>}
    </div>}
    <dialog ref={drawer} aria-labelledby={`${id}-filters-title`} className="exercise-library-drawer"
      onClose={() => drawerTrigger.current?.focus()} onClick={(event) => { if (event.target === event.currentTarget) drawer.current?.close() }}>
      <div className="exercise-library-drawer-handle" aria-hidden="true" />
      <div className="exercise-library-drawer-bar">
        <h2 id={`${id}-filters-title`} className="exercise-library-drawer-title">{labels.filtersTitle}</h2>
        <button type="button" className="exercise-library-drawer-close" aria-label={labels.closeFilters} onClick={() => drawer.current?.close()}>
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      <div className="exercise-library-drawer-filters" role="group" aria-label={labels.filters(0)}>
        <button type="button" className="exercise-library-filter" aria-pressed={filters.discipline} onClick={() => updateFilters({ ...filters, discipline: !filters.discipline })}>{getDisciplineLabelPl(disciplineKey)}</button>
        <button type="button" className="exercise-library-filter" aria-pressed={filters.blockType} onClick={() => updateFilters({ ...filters, blockType: !filters.blockType })}>{getWorkoutBlockLabelPl(blockType)}</button>
        <button type="button" className="exercise-library-filter" aria-pressed={filters.mine} onClick={() => updateFilters({ ...filters, mine: !filters.mine })}>{labels.mine}</button>
      </div>
    </dialog>
  </>

  const custom = <form id={`${id}-custom`} onSubmit={configureCustom} className="exercise-library-form">
    <div className="exercise-library-field">
      <label htmlFor={`${id}-name`} className="exercise-library-label">{labels.name}</label>
      <input ref={customName} id={`${id}-name`} value={libraryUiState.customName} maxLength={100} placeholder={labels.namePlaceholder} className="exercise-library-text-input"
        aria-invalid={error === labels.invalidName || undefined}
        onChange={(event) => { setError(null); onLibraryUiStateChange({ ...libraryUiState, customName: event.target.value }) }} />
    </div>
    {saveToLibrary && <fieldset className="exercise-library-field">
      <legend className="exercise-library-label">{labels.type}</legend>
      <div className="exercise-library-types">
        {EXERCISE_TYPES.map((type) => <label key={type} className="exercise-library-type">
          <input type="radio" className="control-input" name={`${id}-type`} value={type} checked={(libraryUiState.exerciseType ?? 'drill') === type}
            onChange={() => onLibraryUiStateChange({ ...libraryUiState, exerciseType: type })} />
          <span>{labels.types[type]}</span>
        </label>)}
      </div>
    </fieldset>}
    <Switch className="exercise-library-switch" checked={saveToLibrary} description={saveToLibrary ? undefined : labels.planOnly}
      onChange={(event) => onLibraryUiStateChange({ ...libraryUiState, saveToLibrary: event.target.checked })}>{labels.saveToMine}</Switch>
  </form>

  return <div className="exercise-library flex flex-1 flex-col overflow-hidden">
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-[14px] px-4 pb-6 pt-3 md:max-w-2xl">
        <header className="exercise-library-topbar">
          <button type="button" className="exercise-library-back" aria-label={screenHeaderLabels.back} onClick={onBack}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div className="exercise-library-title-wrap">
            <h1 className="exercise-library-title">{labels.addExercise}</h1>
            <p className={`exercise-library-subtitle ${disciplineTextColors[disciplineKey]}`}>{getDisciplineLabelPl(disciplineKey)} · {getWorkoutBlockLabelPl(blockType)}</p>
          </div>
          <span className="exercise-library-topbar-spacer" aria-hidden="true" />
        </header>
        <SegmentedControl ariaLabel={labels.source} options={[{ label: labels.library, value: 'library' }, { label: labels.custom, value: 'custom' }]}
          value={libraryUiState.tab} onChange={(tab) => { onLibraryUiStateChange({ ...libraryUiState, tab }); setError(null) }} />
        {exercises.status === 'loading' && <p role="status" className="text-sm text-muted">{labels.loading}</p>}
        {(exercises.status === 'error' || exercises.invalidDocumentIds.length > 0) && <div role="alert" className="space-y-2 text-sm">
          <p>{exercises.status === 'error' ? labels.loadError : labels.invalid}</p><Button onClick={retryExercises}>{labels.retry}</Button>
        </div>}
        {libraryUiState.tab === 'library' ? library : custom}
        {error && <p role="alert" className="text-sm text-crimson-ink">{error}</p>}
      </div>
    </div>
    {libraryUiState.tab === 'custom' && <div className="exercise-config-submit-bar">
      <div className="mx-auto w-full max-w-lg md:max-w-2xl">
        <button type="submit" form={`${id}-custom`} className="exercise-config-submit chamfer-top-right" disabled={saveToLibrary && !ready}>{labels.next}</button>
      </div>
    </div>}
  </div>
}

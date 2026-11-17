import { useId, useRef, useState, type FormEvent } from 'react'
import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { getDisciplineLabelPl } from '@/domain/discipline/disciplineLabels'
import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import { EXERCISE_TYPES, normalizeExerciseSearch, selectExerciseSections, type PersonalExercise } from '@/domain/exercise/exercise'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import type { WorkoutBlockType } from '@/domain/workout/workout.types'
import { ExerciseForm } from '@/features/exercises/ExerciseForm'
import type { ExerciseDefinition } from '@/features/exercises/validateExerciseDefinition'
import { exerciseLabels as labels } from '@/features/exercises/exerciseLabels'
import { EXERCISE_LIBRARY_FIXTURES } from '@/features/workout-builder/data/exerciseLibraryFixtures'
import { filterExerciseLibrary } from '@/features/workout-builder/utils/exerciseLibraryFilters'
import type { ExerciseLibraryUiState, ExerciseSelection } from './workoutBuilderUi.types'

interface ExerciseLibraryViewProps {
  blockType: WorkoutBlockType; disciplineKey: DisciplineKey
  libraryUiState: ExerciseLibraryUiState
  onLibraryUiStateChange: (nextState: ExerciseLibraryUiState) => void
  onBack: () => void; onConfigure: (selection: ExerciseSelection) => void
}
const fieldClass = 'min-h-touch w-full border border-bd bg-input px-3 py-2 text-base text-ink placeholder:text-faint'
const buttonClass = 'min-h-touch border border-bd px-3 py-2 text-sm font-semibold'

export function ExerciseLibraryView({ blockType, disciplineKey, libraryUiState, onLibraryUiStateChange, onBack, onConfigure }: ExerciseLibraryViewProps) {
  const { exercises, exerciseRepository, retryExercises } = useWorkoutData()
  const id = useId()
  const customName = useRef<HTMLInputElement>(null)
  const [disciplineFilter, setDisciplineFilter] = useState(true)
  const [blockFilter, setBlockFilter] = useState(true)
  const [mine, setMine] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const [copy, setCopy] = useState<{ id: string; sourceId: string; initial: ExerciseDefinition } | null>(null)
  const [notice, setNotice] = useState('')
  const query = normalizeExerciseSearch(libraryUiState.searchQuery)
  const category = libraryUiState.category ?? ''
  const ready = exercises.status === 'ready' && exercises.invalidDocumentIds.length === 0
  const matches = (name: string, disciplines: readonly DisciplineKey[], blocks: readonly WorkoutBlockType[]) =>
    (!disciplineFilter || disciplines.includes(disciplineKey)) && (!blockFilter || blocks.includes(blockType)) && normalizeExerciseSearch(name).includes(query)
  const personal = ready && !category ? exercises.items.filter((exercise) => exercise.archivedAt === null && matches(exercise.namePl, exercise.disciplines, exercise.blockTypes)) : []
  const availableBuiltins = filterExerciseLibrary(EXERCISE_LIBRARY_FIXTURES, disciplineFilter ? disciplineKey : null, blockFilter ? blockType : null, '')
  const categories = [...new Set(availableBuiltins.map((exercise) => exercise.category))].sort((a, b) => a.localeCompare(b, 'pl'))
  const builtins = mine ? [] : filterExerciseLibrary(availableBuiltins, null, null, libraryUiState.searchQuery, category)
  const sections = selectExerciseSections(personal)
  const recent = query ? [] : sections.recent
  const favorites = query ? [] : sections.favorites.filter((exercise) => !recent.some((entry) => entry.id === exercise.id))
  const others = sections.all.filter((exercise) => !recent.some((entry) => entry.id === exercise.id) && !favorites.some((entry) => entry.id === exercise.id))
  function configureCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = libraryUiState.customName.trim()
    if (!name || name.length > 100) { setError(labels.invalidName); customName.current?.focus(); return }
    setError(null)
    onConfigure({ type: 'custom', exerciseNameSnapshot: name, saveToLibrary: libraryUiState.saveToLibrary !== false,
      exerciseType: libraryUiState.exerciseType ?? 'drill', personalId: crypto.randomUUID() })
  }
  async function toggleFavorite(exercise: PersonalExercise) {
    if (inFlight.current) return
    inFlight.current = true; setBusy(true); setError(null)
    try { await exerciseRepository.setFavorite(exercise.id, !exercise.favorite, new Date().toISOString()) }
    catch { setError(labels.error) } finally { inFlight.current = false; setBusy(false) }
  }
  function personalRow(exercise: PersonalExercise) {
    return <li key={exercise.id} className="flex min-w-0 border border-bd bg-surface">
      <button type="button" className="min-h-touch min-w-0 flex-1 break-words px-4 py-3 text-left text-sm font-semibold"
        onClick={() => onConfigure({ type: 'library', combinationId: exercise.id, exerciseNameSnapshot: exercise.namePl, defaultConfiguration: exercise.defaultConfiguration })}>
        {exercise.namePl}{exercises.pendingIds.has(exercise.id) && <span className="mt-1 block text-xs font-normal text-muted">{workoutDataLabels.pending}</span>}
      </button>
      <button type="button" className="min-h-touch min-w-11 shrink-0 px-3 text-lg" disabled={busy} aria-pressed={exercise.favorite}
        aria-label={exercise.favorite ? labels.unfavorite(exercise.namePl) : labels.favorite(exercise.namePl)} onClick={() => void toggleFavorite(exercise)}>
        <span aria-hidden="true">{exercise.favorite ? '★' : '☆'}</span>
      </button>
    </li>
  }
  return <div className="flex flex-1 flex-col overflow-y-auto">
    <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-4 md:max-w-2xl">
      <ScreenHeader title="Dodaj ćwiczenie" onBack={onBack} />
      <p className="text-xs text-muted">Blok docelowy · {getWorkoutBlockLabelPl(blockType)} · {getDisciplineLabelPl(disciplineKey)}</p>
      <SegmentedControl ariaLabel="Źródło ćwiczenia" options={[{ label: 'Biblioteka', value: 'library' }, { label: 'Własne ćwiczenie', value: 'custom' }]}
        value={libraryUiState.tab} onChange={(tab) => { onLibraryUiStateChange({ ...libraryUiState, tab }); setError(null); setCopy(null) }} />
      {exercises.status === 'loading' && <p role="status" className="text-sm text-muted">{labels.loading}</p>}
      {(exercises.status === 'error' || exercises.invalidDocumentIds.length > 0) && <div role="alert" className="space-y-2 text-sm">
        <p>{exercises.status === 'error' ? labels.loadError : labels.invalid}</p><Button onClick={retryExercises}>{labels.retry}</Button>
      </div>}
      {notice && <p role="status" className="text-sm text-muted">{notice}</p>}
      {copy ? <ExerciseForm initial={copy.initial} onCancel={() => setCopy(null)} onSave={async (definition) => {
        const now = new Date().toISOString()
        await exerciseRepository.save({ ...definition, id: copy.id, copiedFromId: copy.sourceId, favorite: false, lastUsedAt: null, archivedAt: null, createdAt: now, updatedAt: now })
        setCopy(null); setNotice(labels.copied)
      }} /> : libraryUiState.tab === 'library' ? <>
        <label className="block space-y-2 text-sm font-semibold" htmlFor={`${id}-search`}>{labels.search}
          <input id={`${id}-search`} type="search" value={libraryUiState.searchQuery} placeholder="Szukaj kombinacji…" className={fieldClass}
            onChange={(event) => onLibraryUiStateChange({ ...libraryUiState, searchQuery: event.target.value })} />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtry ćwiczeń">
          <button type="button" className={buttonClass} aria-pressed={disciplineFilter} onClick={() => setDisciplineFilter(!disciplineFilter)}>{disciplineFilter ? '✓ ' : ''}{getDisciplineLabelPl(disciplineKey)}</button>
          <button type="button" className={buttonClass} aria-pressed={blockFilter} onClick={() => setBlockFilter(!blockFilter)}>{blockFilter ? '✓ ' : ''}{getWorkoutBlockLabelPl(blockType)}</button>
          <button type="button" className={buttonClass} aria-pressed={mine} onClick={() => {
            setMine(!mine); onLibraryUiStateChange({ ...libraryUiState, category: '' })
          }}>{mine ? '✓ ' : ''}{labels.mine}</button>
        </div>
        <label className="block space-y-2 text-sm font-semibold">{labels.category}
          <select className={fieldClass} value={category} disabled={mine} onChange={(event) => onLibraryUiStateChange({ ...libraryUiState, category: event.target.value })}>
            <option value="">{labels.allCategories}</option>
            {[...new Set([...categories, ...(category ? [category] : [])])].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        {recent.length > 0 && <section aria-label={labels.recent}><h2 className="mb-2 font-display font-semibold">{labels.recent}</h2><ul className="space-y-2">{recent.map(personalRow)}</ul></section>}
        {favorites.length > 0 && <section aria-label={labels.favorites}><h2 className="mb-2 font-display font-semibold">{labels.favorites}</h2><ul className="space-y-2">{favorites.map(personalRow)}</ul></section>}
        {personal.length + builtins.length > 0 ? (others.length + builtins.length > 0 && <section aria-label={labels.all}>
          <h2 className="mb-2 font-display font-semibold">{labels.all}</h2>
          <ul aria-label="Wyniki biblioteki ćwiczeń" className="space-y-2">
            {others.map(personalRow)}
            {builtins.map((exercise) => <li key={exercise.id} className="border border-bd bg-surface p-1">
              <button type="button" className="min-h-touch w-full break-words px-3 py-2 text-left text-sm font-semibold"
                onClick={() => onConfigure({ type: 'library', combinationId: exercise.id, exerciseNameSnapshot: exercise.namePl })}>{exercise.namePl}<span aria-hidden="true"> ＋</span></button>
              <button type="button" disabled={!ready} className="min-h-touch px-3 text-sm text-muted underline" onClick={() => setCopy({
                id: crypto.randomUUID(), sourceId: exercise.id,
                initial: { namePl: exercise.namePl, type: exercise.type, disciplines: [...exercise.disciplineKeys], blockTypes: [...exercise.blockTypes],
                  defaultConfiguration: { ...exercise.defaultConfiguration } },
              })}>{labels.copy}</button>
            </li>)}
          </ul>
        </section>) : <div className="space-y-3"><p className="text-sm text-muted">{labels.noResults}</p>
          {libraryUiState.searchQuery.trim() && <Button disabled={!ready} variant="secondary" onClick={() => onLibraryUiStateChange({ ...libraryUiState,
            tab: 'custom', customName: libraryUiState.searchQuery.trim().slice(0, 100), saveToLibrary: true })}>{labels.createFromSearch(libraryUiState.searchQuery.trim().slice(0, 100))}</Button>}
        </div>}
      </> : <form onSubmit={configureCustom} className="space-y-4">
        <label className="block text-sm font-semibold">{labels.name}<input ref={customName} value={libraryUiState.customName} maxLength={100} className={`${fieldClass} mt-2`}
          onChange={(event) => { setError(null); onLibraryUiStateChange({ ...libraryUiState, customName: event.target.value }) }} /></label>
        <fieldset><legend className="text-sm font-semibold">Zapis ćwiczenia</legend>
          {[true, false].map((saveToLibrary) => <label key={String(saveToLibrary)} className="flex min-h-touch items-center gap-2 text-sm">
            <input type="radio" name={`${id}-save`} checked={(libraryUiState.saveToLibrary !== false) === saveToLibrary} className="accent-crimson"
              onChange={() => onLibraryUiStateChange({ ...libraryUiState, saveToLibrary })} />{saveToLibrary ? labels.saveToMine : labels.planOnly}</label>)}
        </fieldset>
        {libraryUiState.saveToLibrary !== false && <label className="block text-sm font-semibold">{labels.type}<select className={`${fieldClass} mt-2`} value={libraryUiState.exerciseType ?? 'drill'}
          onChange={(event) => { const exerciseType = EXERCISE_TYPES.find((value) => value === event.target.value); if (exerciseType) onLibraryUiStateChange({ ...libraryUiState, exerciseType }) }}>
          {EXERCISE_TYPES.map((type) => <option key={type} value={type}>{labels.types[type]}</option>)}
        </select></label>}
        <Button type="submit" variant="secondary" className="w-full" disabled={libraryUiState.saveToLibrary !== false && !ready}>Konfiguruj ćwiczenie</Button>
      </form>}
      {error && <p role="alert" className="text-sm text-crimson-ink">{error}</p>}
    </div>
  </div>
}

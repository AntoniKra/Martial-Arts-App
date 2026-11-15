import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { routes } from '@/app/routes'
import { Button } from '@/components/ui/Button'
import { exerciseIsReferenced, normalizeExerciseSearch, selectExerciseSections, type PersonalExercise } from '@/domain/exercise/exercise'
import { ExerciseForm } from '@/features/exercises/ExerciseForm'
import { exerciseLabels as labels } from '@/features/exercises/exerciseLabels'
import type { ExerciseDefinition } from '@/features/exercises/validateExerciseDefinition'

const initial: ExerciseDefinition = { namePl: '', type: 'drill', disciplines: ['boxing'], blockTypes: ['technique'],
  defaultConfiguration: { mode: 'rounds', roundCount: 3, roundDurationSeconds: 180, restBetweenRoundsSeconds: 60 } }

export function Component() {
  const { exercises, plans, sessions, focusSkills, exerciseRepository, retryExercises } = useWorkoutData()
  const [editor, setEditor] = useState<{ exercise: PersonalExercise | null; initial: ExerciseDefinition } | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const inFlight = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const ready = exercises.status === 'ready' && exercises.invalidDocumentIds.length === 0
  function closeEditor() { setEditor(null); requestAnimationFrame(() => heading.current?.focus()) }
  async function action(run: () => Promise<void>) {
    if (inFlight.current) return
    inFlight.current = true; setBusy(true); setError(false)
    try { await run(); setConfirmId(null) } catch { setError(true) } finally { inFlight.current = false; setBusy(false) }
  }
  async function save(value: ExerciseDefinition) {
    const now = new Date().toISOString()
    const exercise: PersonalExercise = editor?.exercise ? { ...editor.exercise, ...value, updatedAt: now }
      : { ...value, id: crypto.randomUUID(), archivedAt: null, favorite: false, lastUsedAt: null, createdAt: now, updatedAt: now }
    await exerciseRepository.save(exercise)
    closeEditor()
  }
  function row(exercise: PersonalExercise) {
    const referenced = plans.status !== 'ready' || sessions.status !== 'ready' || focusSkills.status !== 'ready'
      || [...plans.invalidDocumentIds, ...sessions.invalidDocumentIds, ...focusSkills.invalidDocumentIds].length > 0
      || exerciseIsReferenced(exercise.id, plans.items, sessions.items, focusSkills.items)
    return <li key={exercise.id} className="space-y-3 border border-bd bg-surface p-4">
      <h2 className="break-words font-display text-lg font-semibold">{exercise.namePl}</h2>
      <p className="text-sm text-muted">{labels.types[exercise.type]}</p>
      {exercises.pendingIds.has(exercise.id) && <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" disabled={busy || !ready} onClick={() => setEditor({ exercise, initial: exercise })}>{labels.edit}</Button>
        <Button size="sm" variant="ghost" disabled={busy || !ready} onClick={() => void action(() => exerciseRepository.setArchived(
          exercise.id, exercise.archivedAt === null ? new Date().toISOString() : null, new Date().toISOString()))}>
          {exercise.archivedAt === null ? labels.archive : labels.restore}</Button>
        <Button size="sm" variant="ghost" disabled={busy || !ready} onClick={() => setEditor({ exercise: null, initial: exercise })}>{labels.newFrom}</Button>
        {exercise.archivedAt !== null && !referenced && <Button size="sm" variant="ghost" disabled={busy || !ready || exercises.fromCache} onClick={() => setConfirmId(exercise.id)}>{labels.remove}</Button>}
      </div>
      {exercise.archivedAt !== null && referenced && <p className="text-sm text-muted">{labels.referenced}</p>}
      {confirmId === exercise.id && <div className="space-y-2 border-t border-bd pt-3">
        <p className="text-sm">{exercise.namePl} — {labels.confirmDelete}</p>
        <Button variant="danger" disabled={busy} onClick={() => void action(() => exerciseRepository.deleteUnused(exercise.id))}>{labels.confirmDelete}</Button>
        <Button variant="ghost" disabled={busy} onClick={() => setConfirmId(null)}>{labels.cancel}</Button>
      </div>}
    </li>
  }
  const sections = selectExerciseSections(exercises.items)
  const matches = (exercise: PersonalExercise) => normalizeExerciseSearch(exercise.namePl).includes(normalizeExerciseSearch(query))
  return <div className="space-y-5 px-4 py-6 md:px-0">
    <Link to={routes.workouts} className="inline-flex min-h-touch items-center text-sm text-muted">← Treningi</Link>
    <h1 ref={heading} tabIndex={-1} className="font-display text-3xl font-bold">{labels.title}</h1>
    {exercises.status === 'loading' && <p role="status">{labels.loading}</p>}
    {exercises.status === 'error' && <p role="alert">{labels.loadError}</p>}
    {exercises.invalidDocumentIds.length > 0 && <p role="alert">{labels.invalid}</p>}
    {(exercises.status === 'error' || exercises.invalidDocumentIds.length > 0) && <Button onClick={retryExercises}>{labels.retry}</Button>}
    {exercises.hasPendingWrites && <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p>}
    {editor ? <ExerciseForm key={editor.exercise?.id ?? 'new'} initial={editor.initial} existing={editor.exercise !== null} onSave={save} onCancel={closeEditor} /> : <>
      <Button disabled={!ready || busy} onClick={() => setEditor({ exercise: null, initial })}>{labels.create}</Button>
      <label className="block text-sm font-semibold">{labels.search}<input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
        className="mt-2 block min-h-touch w-full border border-bd bg-input p-3 text-base" /></label>
      {ready && exercises.items.length === 0 && <p className="text-sm text-muted">{labels.empty}</p>}
      <ul aria-label={labels.title} className="space-y-3">{sections.all.filter(matches).map(row)}</ul>
      <details className="border-t border-bd pt-2"><summary className="min-h-touch cursor-pointer py-3 font-semibold">{labels.archived}</summary>
        <ul className="space-y-3">{exercises.items.filter((exercise) => exercise.archivedAt !== null && matches(exercise)).sort((a, b) => a.namePl.localeCompare(b.namePl, 'pl')).map(row)}</ul>
      </details>
    </>}
    {error && <p role="alert" className="text-sm text-crimson-ink">{labels.error}</p>}
  </div>
}

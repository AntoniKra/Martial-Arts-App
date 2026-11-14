import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import type { QuickTimerWorkoutSession } from '@/domain/workout-session/workoutSession.types'
import type { SparringIntensity } from '@/domain/workout/workout.types'
import { isQuickTimerCategory, type QuickTimerCategory } from '@/domain/quick-timer/quickTimer'
import type { QuickTimerFeedbackDraft } from '@/domain/quick-timer/quickTimerFeedback'
import { workoutSessionName } from '@/features/workouts/utils/workoutSessionPresentation'
import { formatSecondsAsClock } from '@/domain/time/formatDuration'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { workoutFeedbackLabels as feedbackLabels } from '@/features/workout-feedback/workoutFeedbackLabels'
import { sparringIntensityLabels } from '@/features/workout-feedback/sparringIntensityLabels'
import { rpeLabels } from '@/features/workout-feedback/rpeLabels'
import { Button } from '@/components/ui/Button'
import { UnsavedPlanChangesGuard } from '@/features/workout-builder/components/UnsavedPlanChangesGuard'
import { QuickTimerCategoryField } from './QuickTimerCategoryField'
import { quickTimerLabels as labels } from './quickTimerLabels'

export function QuickTimerFeedbackForm({ session, pending, rpeCard, onSave }: {
  session: QuickTimerWorkoutSession; pending: boolean; rpeCard: ReactNode
  onSave: (draft: QuickTimerFeedbackDraft) => Promise<void>
}) {
  const [initial] = useState(() => ({ category: isQuickTimerCategory(session.category) ? session.category : null,
    intensity: session.sparring[0]?.intensity ?? null, note: session.note ?? '' }))
  const [category, setCategory] = useState<QuickTimerCategory | null>(initial.category)
  const [intensity, setIntensity] = useState<SparringIntensity | null>(initial.intensity)
  const [note, setNote] = useState(initial.note)
  const allowLeave = useRef(false)
  const isDirty = category !== initial.category || intensity !== initial.intensity || note !== initial.note
  const [categoryError, setCategoryError] = useState<string>()
  const [noteError, setNoteError] = useState<string>()
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)
  const form = useRef<HTMLFormElement>(null)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy.current) return
    if (!category || note.trim().length > 1000) {
      setCategoryError(category ? undefined : 'Wybierz rodzaj treningu')
      setNoteError(note.trim().length > 1000 ? 'Notatka może mieć najwyżej 1000 znaków.' : undefined)
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    busy.current = true; setSaving(true); setError(false)
    // The save callback also navigates; restore protection if saving fails.
    allowLeave.current = true
    try { await onSave({ category, intensity, note }) } catch { allowLeave.current = false; setError(true) }
    finally { busy.current = false; setSaving(false) }
  }
  const metrics = [formatSecondsAsClock(Math.floor(session.durationSeconds)), formatSecondsAsClock(session.workSeconds), `${session.completion.completed}/${session.completion.planned}`]
  const metricLabels = [feedbackLabels.metrics[0], feedbackLabels.metrics[1], labels.roundsMetric]
  return <UnsavedPlanChangesGuard isDirty={isDirty} allowLeaveRef={allowLeave} description={feedbackLabels.discardDescription}>
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-5">
    <Link to={`${routes.workouts}?tab=history`} className="inline-flex min-h-touch items-center text-xs font-semibold text-muted">{feedbackLabels.back}</Link>
    <header className="space-y-3">
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-crimson-ink">{feedbackLabels.status[session.status]}</p>
      <h1 className="font-display text-2xl font-bold text-ink">{workoutSessionName(session)}</h1>
      <p className="text-[13px] leading-relaxed text-muted">{feedbackLabels.savedEntry}</p>
      {pending && <p role="status" className="text-xs font-semibold text-muted">{workoutDataLabels.pending}</p>}
      <dl className="grid grid-cols-3 divide-x divide-bd border-y border-bd py-4">
        {metrics.map((value, index) => <div key={metricLabels[index]} className="min-w-0 px-2 text-center">
          <dd className="font-display text-[22px] font-bold tabular-nums text-ink">{value}</dd>
          <dt className="mt-1 font-display text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">{metricLabels[index]}</dt>
        </div>)}
      </dl>
    </header>
    {rpeCard}
    <form ref={form} noValidate onSubmit={(event) => { void submit(event) }} className="space-y-6">
      <fieldset disabled={saving} className="min-w-0 space-y-6">
        <QuickTimerCategoryField value={category} error={categoryError} onChange={(value) => { setCategory(value); setCategoryError(undefined); if (value !== 'sparring') setIntensity(null) }} />
        {category === 'sparring' && <fieldset className="min-w-0 space-y-2">
          <legend className="mb-2 text-sm font-semibold text-ink">{labels.intensity} <span className="text-xs font-normal text-muted">({labels.optional})</span></legend>
          {(['light', 'technical', 'hard'] as const).map((value) => <button key={value} type="button" aria-pressed={intensity === value} onClick={() => setIntensity(intensity === value ? null : value)}
            className={`block min-h-touch w-full border p-3 text-left text-sm leading-relaxed ${intensity === value ? 'border-crimson bg-elevated font-semibold text-ink' : 'border-bd bg-surface text-muted'}`}>
            {intensity === value && <span aria-hidden="true">✓ </span>}{sparringIntensityLabels[value]}
          </button>)}
        </fieldset>}
        <label className="block font-display text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{feedbackLabels.noteHeading}
          <textarea rows={4} maxLength={1000} value={note} placeholder={feedbackLabels.notePlaceholder} aria-invalid={!!noteError} aria-describedby={noteError ? 'quick-timer-note-error' : undefined}
            onChange={(event) => { setNote(event.target.value); setNoteError(undefined) }} className="mt-2 block w-full resize-y border border-bd bg-input p-3 font-sans text-base font-normal normal-case tracking-normal text-ink" />
        </label>
        {noteError && <p id="quick-timer-note-error" role="alert" className="text-xs text-crimson-ink">{noteError}</p>}
      </fieldset>
      {error && <p role="alert" className="text-sm text-crimson-ink">{feedbackLabels.saveError}</p>}
      <Button type="submit" loading={saving} size="lg" className="w-full uppercase tracking-[0.1em]">{feedbackLabels.done}</Button>
      <p className="text-center text-xs leading-relaxed text-muted">{rpeLabels.reminderHint}</p>
    </form>
  </div>
  </UnsavedPlanChangesGuard>
}

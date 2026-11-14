import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import type { PlanWorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { canEditSparringIntensity, hasCompletedExercise, selectOtherExercises, type WorkoutFeedbackDraft } from '@/domain/workout-session/workoutFeedback'
import type { PreviousPlanRun } from '@/domain/workout-session/previousPlanRun'
import { Button } from '@/components/ui/Button'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { UnsavedPlanChangesGuard } from '@/features/workout-builder/components/UnsavedPlanChangesGuard'
import { AssessmentScale, FocusCard } from './FocusCard'
import { validateWorkoutFeedback, type FeedbackErrors } from './validateWorkoutFeedback'
import { formatWorkoutFeedbackMetrics, workoutFeedbackLabels as labels } from './workoutFeedbackLabels'
import { PreviousPlanRunSummary } from './PreviousPlanRunSummary'
import { rpeLabels } from './rpeLabels'
import { sparringIntensityLabels } from './sparringIntensityLabels'
import { hasUnsavedWorkoutFeedback } from './unsavedWorkoutFeedback'

export function WorkoutFeedbackForm({ session, skills, pending, onSave, rpeCard, previousRun }: {
  session: PlanWorkoutSession; skills: readonly FocusSkill[]; pending: boolean
  previousRun?: PreviousPlanRun | null
  rpeCard: ReactNode
  onSave: (draft: WorkoutFeedbackDraft) => Promise<void>
}) {
  const [initial] = useState<WorkoutFeedbackDraft>(() => ({ focusRatings: structuredClone(session.focusRatings), exerciseRatings: structuredClone(session.exerciseRatings), sparring: structuredClone(session.sparring), note: session.note ?? '' }))
  const [draft, setDraft] = useState(initial)
  const allowLeave = useRef(false)
  const [errors, setErrors] = useState<FeedbackErrors>({ corrections: {} })
  const [saveError, setSaveError] = useState(false)
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)
  const form = useRef<HTMLFormElement>(null)
  const others = selectOtherExercises(session)
  const editableSparring = draft.sparring.map((entry, index) => ({ entry, index })).filter(({ entry }) => canEditSparringIntensity(entry))
  const assessed = draft.focusRatings.filter((rating) => hasCompletedExercise(session, rating.workoutItemId) && rating.assessment !== null).length
  const metrics = formatWorkoutFeedbackMetrics(session)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy.current) return
    const result = validateWorkoutFeedback(draft)
    if (!result.ok) {
      setErrors(result.errors)
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setErrors({ corrections: {} }); setSaveError(false); setSaving(true); busy.current = true
    // The save callback also navigates; restore protection if saving fails.
    allowLeave.current = true
    try { await onSave(result.values) } catch { allowLeave.current = false; setSaveError(true) } finally { setSaving(false); busy.current = false }
  }

  return <UnsavedPlanChangesGuard isDirty={hasUnsavedWorkoutFeedback(draft, initial)} allowLeaveRef={allowLeave} description={labels.discardDescription}>
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-5">
    <div className="flex flex-wrap justify-between gap-x-4">
      <Link to={routes.workoutDetails(session.workoutPlanId)} className="inline-flex min-h-touch items-center text-[12px] font-semibold text-muted"><span aria-hidden="true" className="mr-1">←</span>{labels.backToPlan}</Link>
      <Link to={`${routes.workouts}?tab=history`} className="inline-flex min-h-touch items-center text-[12px] font-semibold text-muted">{labels.back}</Link>
    </div>
    <header className="space-y-3">
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-crimson-ink">{labels.status[session.status]}</p>
      <h1 className="break-words font-display text-2xl font-bold text-ink">{session.workoutPlanNameSnapshot}</h1>
      <p className="text-[13px] leading-relaxed text-muted">{labels.savedEntry}</p>
      {pending && <p role="status" className="text-[12px] font-semibold text-muted">{workoutDataLabels.pending}</p>}
      <dl className="grid grid-cols-3 divide-x divide-bd border-y border-bd py-4">
        {metrics.map((value, index) => <div key={labels.metrics[index]} className="min-w-0 px-2 text-center">
          <dd className="font-display text-[22px] font-bold tabular-nums text-ink">{value}</dd>
          <dt className="mt-1 font-display text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">{labels.metrics[index]}</dt>
        </div>)}
      </dl>
    </header>
    {previousRun && <PreviousPlanRunSummary previous={previousRun} />}
    {rpeCard}
    <form ref={form} onSubmit={(event) => { void submit(event) }} noValidate className="space-y-6">
      <fieldset disabled={saving} className="min-w-0 space-y-6">
        {editableSparring.map(({ entry, index }, visibleIndex) => <fieldset key={entry.blockId} className="min-w-0 space-y-2">
          <legend className="mb-2 text-sm font-semibold text-ink">{labels.sparringIntensity(visibleIndex + 1)}</legend>
          {(['light', 'technical', 'hard'] as const).map((intensity) => <button key={intensity} type="button" aria-pressed={entry.intensity === intensity}
            onClick={() => setDraft((current) => ({ ...current, sparring: current.sparring.map((value, valueIndex) => valueIndex === index
              ? { ...value, intensity: value.intensity === intensity ? null : intensity } : value) }))}
            className={`block min-h-touch w-full border p-3 text-left text-sm leading-relaxed ${entry.intensity === intensity ? 'border-crimson bg-elevated font-semibold text-ink' : 'border-bd bg-surface text-muted'}`}>
            {entry.intensity === intensity && <span aria-hidden="true">✓ </span>}{sparringIntensityLabels[intensity]}
          </button>)}
        </fieldset>)}
        {draft.focusRatings.length > 0 && <section aria-labelledby="focus-feedback-heading" className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="focus-feedback-heading" className="font-display text-[12px] font-semibold uppercase tracking-[0.1em] text-ink">{labels.focusHeading}</h2>
            <p className="text-[11px] tabular-nums text-muted">{labels.assessed(assessed, draft.focusRatings.length)}</p>
          </div>
          {draft.focusRatings.map((rating, index) => <FocusCard key={rating.workoutItemId} rating={rating} session={session} skills={skills}
            first={draft.focusRatings.findIndex((value) => value.focusSkillId === rating.focusSkillId) === index}
            error={errors.corrections[rating.workoutItemId]} onChange={(edited) => {
              setDraft((current) => ({ ...current, focusRatings: current.focusRatings.map((value) => value.workoutItemId === edited.workoutItemId ? edited : value) }))
              setErrors((current) => ({ ...current, corrections: { ...current.corrections, [edited.workoutItemId]: '' } }))
            }} />)}
        </section>}
        <details className="border-y border-bd">
          <summary className="min-h-touch cursor-pointer py-4 text-[12px] font-semibold text-muted">{labels.othersHeading(others.length)}</summary>
          <div className="space-y-5 pb-4">{others.map((exercise) => <article key={exercise.workoutItemId} aria-label={exercise.nameSnapshot} className="space-y-3 border border-bd bg-surface p-4">
            <h3 className="break-words font-display text-sm font-semibold text-ink">{exercise.nameSnapshot}</h3>
            <AssessmentScale question={labels.otherQuestion} descriptions={labels.otherScale}
              value={draft.exerciseRatings.find((value) => value.workoutItemId === exercise.workoutItemId)?.rating ?? null}
              onChange={(rating) => setDraft((current) => ({ ...current, exerciseRatings: [
                ...current.exerciseRatings.filter((value) => value.workoutItemId !== exercise.workoutItemId),
                ...(typeof rating === 'number' ? [{ ...exercise, rating }] : []),
              ] }))} />
          </article>)}</div>
        </details>
        <label className="block font-display text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
          {labels.noteHeading}
          <textarea rows={4} maxLength={1000} value={draft.note ?? ''} placeholder={labels.notePlaceholder} aria-invalid={!!errors.note}
            aria-describedby={errors.note ? 'feedback-note-error' : undefined}
            onChange={(event) => { setDraft((current) => ({ ...current, note: event.target.value })); setErrors((current) => ({ ...current, note: undefined })) }}
            className="mt-2 block w-full resize-y border border-bd bg-input p-3 font-sans text-[16px] font-normal normal-case tracking-normal text-ink" />
        </label>
        {errors.note && <p id="feedback-note-error" role="alert" className="text-[12px] text-crimson-ink">{errors.note}</p>}
      </fieldset>
      {saveError && <p role="alert" className="text-[13px] text-crimson-ink">{labels.saveError}</p>}
      <Button type="submit" loading={saving} size="lg" className="w-full uppercase tracking-[0.1em]">{labels.done}</Button>
      <p className="text-center text-[12px] leading-relaxed text-muted">{rpeLabels.reminderHint}</p>
    </form>
  </div>
  </UnsavedPlanChangesGuard>
}

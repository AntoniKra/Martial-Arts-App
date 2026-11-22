import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { routes } from '@/app/routes'
import { RouteScreenHeader } from '@/components/ScreenHeader'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import type { PlanWorkoutSession, WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { findPreviousAssessment } from '@/domain/focus-skill/previousAssessment'
import { canEditSparringIntensity, hasCompletedExercise, selectOtherExercises, type WorkoutFeedbackDraft } from '@/domain/workout-session/workoutFeedback'
import type { PreviousPlanRun } from '@/domain/workout-session/previousPlanRun'
import { Button } from '@/components/ui/Button'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { UnsavedPlanChangesGuard } from '@/features/workout-builder/components/UnsavedPlanChangesGuard'
import { FeedbackIcon } from './FeedbackIcon'
import { AssessmentScale, FocusCard } from './FocusCard'
import { validateWorkoutFeedback, type FeedbackErrors } from './validateWorkoutFeedback'
import { formatWorkoutFeedbackMetrics, workoutFeedbackLabels as labels } from './workoutFeedbackLabels'
import { PreviousPlanRunSummary } from './PreviousPlanRunSummary'
import { hasUnsavedWorkoutFeedback } from './unsavedWorkoutFeedback'

export function WorkoutFeedbackForm({ session, skills, pending, onSave, rpeCard, previousRun, sessions = [] }: {
  sessions?: readonly WorkoutSession[]
  session: PlanWorkoutSession; skills: readonly FocusSkill[]; pending: boolean
  previousRun?: PreviousPlanRun | null
  rpeCard: ReactNode
  onSave: (draft: WorkoutFeedbackDraft) => Promise<void>
}) {
  const [initial] = useState<WorkoutFeedbackDraft>(() => ({ focusRatings: structuredClone(session.focusRatings), exerciseRatings: structuredClone(session.exerciseRatings), sparring: structuredClone(session.sparring), note: session.note ?? '' }))
  const [draft, setDraft] = useState(initial)
  const [othersOpen, setOthersOpen] = useState(false)
  const allowLeave = useRef(false)
  const [errors, setErrors] = useState<FeedbackErrors>({ corrections: {} })
  const [saveError, setSaveError] = useState(false)
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)
  const form = useRef<HTMLFormElement>(null)
  const others = selectOtherExercises(session)
  const editableSparring = draft.sparring.map((entry, index) => ({ entry, index })).filter(({ entry }) => canEditSparringIntensity(entry))
  const assessed = draft.focusRatings.filter((rating) => hasCompletedExercise(session, rating.workoutItemId) && rating.assessment !== null).length
  const assessedOthers = draft.exerciseRatings.filter((rating) => others.some((other) => other.workoutItemId === rating.workoutItemId)).length
  const [duration, work, completion] = formatWorkoutFeedbackMetrics(session)

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
    <div className="motion-controls mx-auto w-full max-w-xl space-y-5 px-4 pt-3 pb-9">
    <div className="space-y-4">
      <RouteScreenHeader title={labels.status[session.status]} variant="summary" fallback={routes.progressHistory}
        action={pending
          ? <span role="status" className="feedback-badge is-countdown">{workoutDataLabels.pending}</span>
          : <span className="feedback-badge is-saved"><FeedbackIcon kind="check" size={12} />{labels.savedBadge}</span>}
        subtitle={<h2 className="wrap-anywhere font-display text-base font-extrabold tracking-tight text-ink">{session.workoutPlanNameSnapshot}</h2>} />
      <section aria-label={labels.metricsHeading} className="feedback-surface">
        <dl className="grid grid-cols-2">
          <div className="feedback-work-time col-span-2 space-y-0.5 rounded-t-sm px-4 pt-4 pb-3.5">
            <dt className="feedback-eyebrow flex items-center gap-1.5"><FeedbackIcon kind="clock" size={13} />{labels.workTime}</dt>
            <dd className="font-display text-[36px] leading-[1.05] font-black tracking-tight tabular-nums text-ink">{work}</dd>
          </div>
          {[[labels.metrics[0], duration], [labels.metrics[2], completion]].map(([name, value], index) => <div key={name}
            className={`flex min-w-0 flex-col border-t border-bd px-3.5 py-2.5 ${index === 0 ? 'border-r' : ''}`}>
            <dt className="order-last text-[10px] font-bold tracking-wider text-muted uppercase">{name}</dt>
            <dd className="font-display text-lg font-extrabold tabular-nums text-ink">{value}</dd>
          </div>)}
        </dl>
        {previousRun && <PreviousPlanRunSummary previous={previousRun} />}
      </section>
    </div>
    {rpeCard}
    <form ref={form} onSubmit={(event) => { void submit(event) }} noValidate className="space-y-5">
      <fieldset disabled={saving} className="min-w-0 space-y-5">
        {draft.focusRatings.length > 0 && <section aria-labelledby="focus-feedback-heading" className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="focus-feedback-heading" className="font-display text-base font-extrabold text-ink">{labels.focusHeading}</h2>
            <p className="text-[11px] tabular-nums text-muted">{labels.assessed(assessed, draft.focusRatings.length)}</p>
          </div>
          {draft.focusRatings.map((rating, index) => <FocusCard key={rating.workoutItemId} rating={rating} session={session} skills={skills}
            previousAssessment={findPreviousAssessment(session, rating.focusSkillId, rating.criterionSnapshot, sessions)}
            first={draft.focusRatings.findIndex((value) => value.focusSkillId === rating.focusSkillId) === index}
            error={errors.corrections[rating.workoutItemId]} onChange={(edited) => {
              setDraft((current) => ({ ...current, focusRatings: current.focusRatings.map((value) => value.workoutItemId === edited.workoutItemId ? edited : value) }))
              setErrors((current) => ({ ...current, corrections: { ...current.corrections, [edited.workoutItemId]: '' } }))
            }} />)}
        </section>}
        <div className="feedback-surface space-y-3 p-3.5">
          {editableSparring.map(({ entry, index }, visibleIndex) => <fieldset key={entry.blockId} className="min-w-0">
            <legend className="feedback-eyebrow mb-1.5">{labels.sparringIntensity(visibleIndex + 1)}</legend>
            <div className="grid grid-cols-3 gap-1.5">
              {(['light', 'technical', 'hard'] as const).map((intensity) => <button key={intensity} type="button" aria-pressed={entry.intensity === intensity}
                onClick={() => setDraft((current) => ({ ...current, sparring: current.sparring.map((value, valueIndex) => valueIndex === index
                  ? { ...value, intensity: value.intensity === intensity ? null : intensity } : value) }))}
                className="feedback-sparring-option motion-press">
                <span className="feedback-sparring-title">
                  {entry.intensity === intensity && <span aria-hidden="true">✓ </span>}{labels.sparringOptions[intensity].name}
                </span>{' '}
                <span className="feedback-sparring-description">{labels.sparringOptions[intensity].description}</span>
              </button>)}
            </div>
          </fieldset>)}
          <div className="rounded-sm border border-bd bg-elevated">
            <button type="button" aria-expanded={othersOpen} aria-controls="other-exercises" onClick={() => setOthersOpen(!othersOpen)}
              className="flex min-h-touch w-full items-center gap-2 rounded-sm px-3 py-1.5 text-left text-[12.5px] text-ink">
              <strong className="mr-auto">{labels.othersHeading}</strong>
              <span className="feedback-badge is-assessed tabular-nums">{labels.othersAssessed(assessedOthers, others.length)}</span>
              <FeedbackIcon kind="chevron" size={16} className={`feedback-others-chevron shrink-0 ${othersOpen ? 'rotate-180' : ''}`} />
            </button>
            <div id="other-exercises" hidden={!othersOpen} className="space-y-2.5 rounded-b-sm border-t border-bd bg-surface p-3">{others.map((exercise) => <article key={exercise.workoutItemId} aria-label={exercise.nameSnapshot} className="space-y-1.5">
              <h3 className="wrap-anywhere font-display text-[13.5px] font-extrabold text-ink">{exercise.nameSnapshot}</h3>
              <AssessmentScale question={labels.otherQuestion} descriptions={labels.otherScale} summary
                value={draft.exerciseRatings.find((value) => value.workoutItemId === exercise.workoutItemId)?.rating ?? null}
                onChange={(rating) => setDraft((current) => ({ ...current, exerciseRatings: [
                  ...current.exerciseRatings.filter((value) => value.workoutItemId !== exercise.workoutItemId),
                  ...(typeof rating === 'number' ? [{ ...exercise, rating }] : []),
                ] }))} />
            </article>)}</div>
          </div>
        </div>
        <label className="feedback-surface feedback-eyebrow block p-3">
          {labels.noteHeading}
          <textarea rows={2} maxLength={1000} value={draft.note ?? ''} placeholder={labels.notePlaceholder} aria-invalid={!!errors.note}
            aria-describedby={errors.note ? 'feedback-note-error' : undefined}
            onChange={(event) => { setDraft((current) => ({ ...current, note: event.target.value })); setErrors((current) => ({ ...current, note: undefined })) }}
            className="feedback-textarea mt-1.5 min-h-16" />
        </label>
        {errors.note && <p id="feedback-note-error" role="alert" className="text-[12px] text-crimson-ink">{errors.note}</p>}
      </fieldset>
      {saveError && <p role="alert" className="text-[13px] text-crimson-ink">{labels.saveError}</p>}
      <Button type="submit" loading={saving} size="lg" className="feedback-submit w-full uppercase">{labels.done}</Button>
    </form>
  </div>
  </UnsavedPlanChangesGuard>
}

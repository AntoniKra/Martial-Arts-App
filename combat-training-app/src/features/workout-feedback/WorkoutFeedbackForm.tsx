import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { AutoGrowTextarea } from '@/components/ui/AutoGrowTextarea'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import type { PlanWorkoutSession, WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { findPreviousAssessment } from '@/domain/focus-skill/previousAssessment'
import { canEditSparringIntensity, hasCompletedExercise, selectOtherExercises, type WorkoutFeedbackDraft } from '@/domain/workout-session/workoutFeedback'
import { Button } from '@/components/ui/Button'
import { UnsavedPlanChangesGuard } from '@/features/workout-builder/components/UnsavedPlanChangesGuard'
import { FeedbackIcon } from './FeedbackIcon'
import { AssessmentScale, FocusCard } from './FocusCard'
import { validateWorkoutFeedback, type FeedbackErrors } from './validateWorkoutFeedback'
import { workoutFeedbackLabels as labels } from './workoutFeedbackLabels'
import { WorkoutFeedbackSummary } from './WorkoutFeedbackSummary'
import { hasUnsavedWorkoutFeedback } from './unsavedWorkoutFeedback'

export function WorkoutFeedbackForm({ session, skills, pending, onSave, rpeCard, sessions = [] }: {
  sessions?: readonly WorkoutSession[]
  session: PlanWorkoutSession; skills: readonly FocusSkill[]; pending: boolean
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
    <WorkoutFeedbackSummary session={session} pending={pending} />
    {rpeCard}
    <form ref={form} onSubmit={(event) => { void submit(event) }} noValidate className="space-y-5">
      <fieldset disabled={saving} className="min-w-0 space-y-5">
        {draft.focusRatings.length > 0 && <section aria-labelledby="focus-feedback-heading" className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="focus-feedback-heading" className="font-display text-base font-extrabold text-ink">{labels.focusHeading}</h2>
            <span className="feedback-badge is-assessed tabular-nums">{labels.assessed(assessed, draft.focusRatings.length)}</span>
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
                <span className="feedback-sparring-title">{labels.sparringOptions[intensity].name}</span>{' '}
                <span className="feedback-sparring-description">{labels.sparringOptions[intensity].description}</span>
              </button>)}
            </div>
          </fieldset>)}
          <div className="rounded-sm border border-bd bg-elevated">
            <button type="button" aria-expanded={othersOpen} aria-controls="other-exercises" onClick={() => setOthersOpen(!othersOpen)}
              className="flex min-h-touch w-full items-center gap-2 rounded-sm px-3 py-1.5 text-left text-[12.5px] text-ink">
              <strong className="mr-auto">{labels.othersHeading}</strong>
              <span className="feedback-badge is-assessed tabular-nums">{labels.assessed(assessedOthers, others.length)}</span>
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
          <AutoGrowTextarea rows={3} maxLength={1000} value={draft.note ?? ''} placeholder={labels.notePlaceholder} aria-invalid={!!errors.note}
            aria-describedby={errors.note ? 'feedback-note-error' : undefined}
            onChange={(event) => { setDraft((current) => ({ ...current, note: event.target.value })); setErrors((current) => ({ ...current, note: undefined })) }}
            className="feedback-textarea mt-1.5" />
        </label>
        {errors.note && <p id="feedback-note-error" role="alert" className="text-[12px] text-crimson-ink">{errors.note}</p>}
      </fieldset>
      {saveError && <p role="alert" className="text-[13px] text-crimson-ink">{labels.saveError}</p>}
      <Button type="submit" loading={saving} size="lg" className="feedback-submit w-full uppercase">{labels.done}</Button>
    </form>
  </div>
  </UnsavedPlanChangesGuard>
}

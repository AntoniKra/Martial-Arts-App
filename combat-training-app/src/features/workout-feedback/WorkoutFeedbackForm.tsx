import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import type { FocusRating, PlanWorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { getPreviousCorrection, hasCompletedExercise, selectOtherExercises, type WorkoutFeedbackDraft } from '@/domain/workout-session/workoutFeedback'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { formatSecondsAsClock } from '@/domain/time/formatDuration'
import { Button } from '@/components/ui/Button'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { CorrectionNote } from './CorrectionNote'
import { isValidCorrectionText, validateWorkoutFeedback, type FeedbackErrors } from './validateWorkoutFeedback'
import { workoutFeedbackLabels as labels } from './workoutFeedbackLabels'
import { rpeLabels } from './rpeLabels'

function AssessmentScale({ question, descriptions, value, onChange, unable = false }: {
  question: string; descriptions: readonly string[]; value: number | 'unableToRate' | null
  onChange: (value: number | 'unableToRate' | null) => void; unable?: boolean
}) {
  const name = useId()
  return <fieldset className="min-w-0 space-y-2">
    <legend className="mb-2 text-[13px] font-semibold text-ink">{question}</legend>
    {descriptions.map((description, index) => <label key={description}
      className={`flex min-h-touch cursor-pointer items-center gap-3 border px-3 py-2 text-[12px] leading-relaxed ${value === index + 1 ? 'border-crimson bg-elevated text-ink' : 'border-bd text-muted'}`}>
      <input className="shrink-0 accent-crimson" type="radio" name={name} value={index + 1} checked={value === index + 1}
        onChange={() => onChange(index + 1)} />
      <span className="font-display text-base font-semibold tabular-nums">{index + 1}</span>
      <span>{description}</span>
    </label>)}
    {unable && <label className={`flex min-h-touch cursor-pointer items-center gap-3 border px-3 py-2 text-[12px] ${value === 'unableToRate' ? 'border-crimson text-ink' : 'border-bd text-muted'}`}>
      <input type="radio" className="accent-crimson" name={name} checked={value === 'unableToRate'} onChange={() => onChange('unableToRate')} />{labels.unable}
    </label>}
    {value !== null && <button type="button" className="min-h-touch text-xs text-muted underline" onClick={() => onChange(null)}>{labels.clearAssessment}</button>}
  </fieldset>
}

function FocusCard({ session, rating, skills, first, onChange, error }: {
  session: PlanWorkoutSession; rating: FocusRating; skills: readonly FocusSkill[]; first: boolean
  onChange: (rating: FocusRating) => void; error?: string
}) {
  const id = useId()
  const [expanded, setExpanded] = useState(rating.correction !== null)
  const correctionVisible = expanded || !!error
  const previous = first ? getPreviousCorrection(session, skills.find((skill) => skill.id === rating.focusSkillId)) : null
  const eligible = hasCompletedExercise(session, rating.workoutItemId)
  return <article aria-labelledby={`${id}-name`} className="min-w-0 space-y-4 border border-bd bg-surface p-4">
    <div>
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-crimson-ink">{getWorkoutBlockLabelPl(rating.blockType)}</p>
      <h3 id={`${id}-name`} className="mt-1 break-words font-display text-lg font-bold leading-snug text-ink">{rating.skillNameSnapshot}</h3>
    </div>
    <div className="border-l-2 border-bd pl-3">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{labels.criterion}</p>
      <p className="mt-1 break-words text-[13px] leading-relaxed text-ink">{rating.criterionSnapshot}</p>
    </div>
    {previous && <CorrectionNote correction={previous} />}
    {!eligible ? <p className="text-[13px] font-semibold text-muted">{labels.skipped}</p> : <>
      {previous && <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-ink">{labels.todayQuestion}</legend>
        <div className="grid grid-cols-3 gap-1">
          {(Object.keys(labels.checks) as (keyof typeof labels.checks)[]).map((check) => <label key={check}
            className={`flex min-h-touch cursor-pointer items-center justify-center gap-1 border px-1 text-center text-[11px] ${rating.previousCorrectionCheck === check ? 'border-crimson text-ink' : 'border-bd text-muted'}`}>
            <input type="radio" className="size-3 shrink-0 accent-crimson" name={`${id}-check`} checked={rating.previousCorrectionCheck === check}
              onChange={() => onChange({ ...rating, previousCorrectionCheck: check })} />{labels.checks[check]}
          </label>)}
        </div>
      </fieldset>}
      <AssessmentScale question={labels.focusQuestion} descriptions={labels.focusScale} value={rating.assessment}
        onChange={(assessment) => onChange({ ...rating, assessment })} unable />
      <button type="button" aria-expanded={correctionVisible} aria-controls={`${id}-correction`} onClick={() => setExpanded(!expanded)}
        className="min-h-touch text-left text-[12px] font-semibold text-crimson-ink underline underline-offset-4">{labels.newCorrection}</button>
      {correctionVisible && <fieldset id={`${id}-correction`} className="min-w-0 space-y-3 border-t border-bd pt-3">
        <legend className="max-w-full pt-3 font-display text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{labels.correctionHeading}</legend>
        {(['problem', 'fix'] as const).map((field) => <label key={field} className="block text-[12px] font-semibold text-ink">
          {labels[field]}
          <textarea rows={2} value={rating.correction?.[field] ?? ''} maxLength={200}
            aria-invalid={!!error && !isValidCorrectionText(rating.correction?.[field] ?? '')} aria-describedby={error ? `${id}-error` : undefined}
            placeholder={field === 'problem' ? labels.problemPlaceholder : labels.fixPlaceholder}
            className="mt-1 block min-h-touch w-full resize-y border border-bd bg-input p-3 text-[16px] font-normal text-ink"
            onChange={(event) => onChange({ ...rating, correction: { problem: rating.correction?.problem ?? '', fix: rating.correction?.fix ?? '', [field]: event.target.value } })} />
        </label>)}
        <p className="text-[12px] leading-relaxed text-muted">{labels.correctionHint}</p>
      </fieldset>}
      {error && <p id={`${id}-error`} role="alert" className="text-[12px] text-crimson-ink">{error}</p>}
    </>}
  </article>
}

export function WorkoutFeedbackForm({ session, skills, pending, onSave, rpeCard }: {
  session: PlanWorkoutSession; skills: readonly FocusSkill[]; pending: boolean
  rpeCard: ReactNode
  onSave: (draft: WorkoutFeedbackDraft) => Promise<void>
}) {
  const [draft, setDraft] = useState<WorkoutFeedbackDraft>(() => ({ focusRatings: structuredClone(session.focusRatings), exerciseRatings: structuredClone(session.exerciseRatings), note: session.note }))
  const [errors, setErrors] = useState<FeedbackErrors>({ corrections: {} })
  const [saveError, setSaveError] = useState(false)
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)
  const form = useRef<HTMLFormElement>(null)
  const others = selectOtherExercises(session)
  const assessed = draft.focusRatings.filter((rating) => hasCompletedExercise(session, rating.workoutItemId) && rating.assessment !== null).length
  const metrics = [formatSecondsAsClock(Math.floor(session.durationSeconds)), formatSecondsAsClock(session.workSeconds), `${session.completion.completed}/${session.completion.planned}`]

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
    try { await onSave(result.values) } catch { setSaveError(true) } finally { setSaving(false); busy.current = false }
  }

  return <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-5">
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
    {rpeCard}
    <form ref={form} onSubmit={(event) => { void submit(event) }} noValidate className="space-y-6">
      <fieldset disabled={saving} className="min-w-0 space-y-6">
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
}

import { useId, useState, type ReactNode } from 'react'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import type { FocusRating, PlanWorkoutSession } from '@/domain/workout-session/workoutSession.types'
import type { ManualFocusRatingDraft } from '@/domain/workout-session/manualWorkoutEntry'
import { getPreviousCorrection, hasCompletedExercise } from '@/domain/workout-session/workoutFeedback'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { CorrectionNote } from './CorrectionNote'
import { isValidCorrectionText } from './validateWorkoutFeedback'
import { workoutFeedbackLabels as labels } from './workoutFeedbackLabels'

export function AssessmentScale({ question, descriptions, value, onChange, unable = false }: {
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

export function FocusCard<T extends FocusRating | ManualFocusRatingDraft>({ session, rating, skills, first, onChange, error, children, correctionLabel }: {
  session: PlanWorkoutSession | Pick<PlanWorkoutSession, 'id' | 'workoutDate'>; rating: T; skills: readonly FocusSkill[]; first: boolean
  onChange: (rating: T) => void; error?: string; children?: ReactNode; correctionLabel?: string
}) {
  const id = useId()
  const [expanded, setExpanded] = useState(rating.correction !== null)
  const correctionVisible = expanded || !!error
  const previous = first ? getPreviousCorrection(session, skills.find((skill) => skill.id === rating.focusSkillId)) : null
  const eligible = !('stepResults' in session) || (rating.workoutItemId !== null && hasCompletedExercise(session, rating.workoutItemId))
  return <article aria-labelledby={`${id}-name`} className="min-w-0 space-y-4 border border-bd bg-surface p-4">
    <div>
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-crimson-ink">{rating.blockType ? getWorkoutBlockLabelPl(rating.blockType) : labels.focusHeading}</p>
      <h3 id={`${id}-name`} className="mt-1 break-words font-display text-lg font-bold leading-snug text-ink">{rating.skillNameSnapshot}</h3>
    </div>
    <div className="border-l-2 border-bd pl-3">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{labels.criterion}</p>
      <p className="mt-1 break-words text-[13px] leading-relaxed text-ink">{rating.criterionSnapshot}</p>
    </div>
    {children}
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
        className="min-h-touch text-left text-[12px] font-semibold text-crimson-ink underline underline-offset-4">{correctionLabel ?? labels.newCorrection}</button>
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

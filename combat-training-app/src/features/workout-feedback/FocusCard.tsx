import { useId, useState, type ReactNode } from 'react'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import type { FocusRating, PlanWorkoutSession } from '@/domain/workout-session/workoutSession.types'
import type { ManualFocusRatingDraft } from '@/domain/workout-session/manualWorkoutEntry'
import { getPreviousCorrection, hasCompletedExercise } from '@/domain/workout-session/workoutFeedback'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { CorrectionNote } from './CorrectionNote'
import { isValidCorrectionText } from './validateWorkoutFeedback'
import { workoutFeedbackLabels as labels } from './workoutFeedbackLabels'
import type { findPreviousAssessment } from '@/domain/focus-skill/previousAssessment'
import { ChoiceTile } from '@/components/ui/ChoiceTile'
import { FeedbackIcon } from './FeedbackIcon'
import { formatCorrectionDate } from './workoutFeedbackLabels'

export function AssessmentScale({ question, descriptions, value, onChange, unable = false, previousValue }: {
  question: string; descriptions: readonly string[]; value: number | 'unableToRate' | null
  onChange: (value: number | 'unableToRate' | null) => void; unable?: boolean; previousValue?: number | 'unableToRate' | null
}) {
  const name = useId()
  return <fieldset className="min-w-0 space-y-1.5">
    <legend className="mb-2 font-display text-base font-extrabold text-ink">{question}</legend>
    {descriptions.map((description, index) => <ChoiceTile key={description} name={name} value={index + 1}
      checked={value === index + 1} onChange={() => onChange(index + 1)} className="assessment-option"
      ariaLabel={`${index + 1} ${description}${previousValue === index + 1 ? ' · ostatnio' : ''}`}>
      <span className={`choice-number ${previousValue === index + 1 ? 'is-previous' : ''}`}>{index + 1}</span>
      <span className="flex min-w-0 flex-col gap-1">{description}
        {previousValue === index + 1 && <span className="w-max rounded-sm border border-bd px-1.5 py-0.5 text-[11px] text-muted">ostatnio</span>}
      </span>
    </ChoiceTile>)}
    {unable && <ChoiceTile name={name} value="unableToRate" checked={value === 'unableToRate'} onChange={() => onChange('unableToRate')} variant="text">{labels.unable}</ChoiceTile>}
    {value !== null && <button type="button" className="min-h-touch text-xs text-muted" onClick={() => onChange(null)}>{labels.clearAssessment}</button>}
  </fieldset>
}

export function FocusCard<T extends FocusRating | ManualFocusRatingDraft>({ session, rating, skills, first, onChange, error, children, correctionLabel, previousAssessment }: {
  session: PlanWorkoutSession | Pick<PlanWorkoutSession, 'id' | 'workoutDate'>; rating: T; skills: readonly FocusSkill[]; first: boolean
  onChange: (rating: T) => void; error?: string; children?: ReactNode; correctionLabel?: string
  previousAssessment?: ReturnType<typeof findPreviousAssessment>
}) {
  const id = useId()
  const [expanded, setExpanded] = useState(rating.correction !== null)
  const correctionVisible = expanded || !!error
  const previous = first ? getPreviousCorrection(session, skills.find((skill) => skill.id === rating.focusSkillId)) : null
  const eligible = !('stepResults' in session) || (rating.workoutItemId !== null && hasCompletedExercise(session, rating.workoutItemId))
  return <article aria-labelledby={`${id}-name`} className="min-w-0 space-y-3 rounded-sm border border-bd bg-surface p-4">
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
      <p className={`font-display text-[11px] font-bold uppercase tracking-[0.1em] ${eligible ? 'text-crimson-ink' : 'text-muted'}`}>{rating.blockType ? getWorkoutBlockLabelPl(rating.blockType) : labels.focusHeading}</p>
      {!eligible && <span className="status-badge is-missed"><FeedbackIcon kind="skip" size={12} />{labels.skipped}</span>}
      </div>
      <h3 id={`${id}-name`} className={`mt-1 break-words font-display text-xl font-extrabold leading-snug ${eligible ? 'text-ink' : 'text-muted'}`}>{rating.skillNameSnapshot}</h3>
    </div>
    <div className="flex gap-2.5 rounded-sm border border-bd bg-elevated p-3">
      <FeedbackIcon kind="goal" className={eligible ? 'mt-0.5 text-ember' : 'mt-0.5 text-muted'} />
      <div className="min-w-0">
        <p className={`text-[11px] font-bold uppercase tracking-widest ${eligible ? 'text-ember-ink' : 'text-muted'}`}>{labels.criterion}</p>
        <p className={`mt-0.5 break-words text-[15px] leading-relaxed ${eligible ? 'text-ink' : 'text-muted'}`}>{rating.criterionSnapshot}</p>
      </div>
    </div>
    {children}
    {previousAssessment && <p className="w-fit rounded-sm border border-bd px-2 py-1 text-xs text-muted">Ostatnio <strong className="text-ink">{typeof previousAssessment.assessment === 'number' ? `${previousAssessment.assessment}/5` : labels.unable}</strong> · {formatCorrectionDate(previousAssessment.workoutDate)} · {getWorkoutBlockLabelPl(previousAssessment.blockType)}</p>}
    {previous && <CorrectionNote correction={previous} />}
    {!eligible ? <div className="flex items-start gap-2.5 rounded-sm border border-bd bg-elevated p-3">
      <FeedbackIcon kind="skip" className="text-muted" />
      <div><p className="text-sm font-bold text-ink">{labels.skippedHeading}</p><p className="mt-0.5 text-xs leading-relaxed text-muted">{labels.skippedHint}</p></div>
    </div> : <>
      {previous && <fieldset className="min-w-0">
        <legend className="mb-2 font-display text-base font-extrabold text-ink">{labels.todayQuestion}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['better', 'same'] as const).map((check) => <ChoiceTile key={check} name={`${id}-check`} value={check}
            checked={rating.previousCorrectionCheck === check} onChange={() => onChange({ ...rating, previousCorrectionCheck: check })} className="correction-option">
            <FeedbackIcon kind={check} size={28} className={check === 'better' ? 'text-success-ink' : 'text-muted'} />{labels.checks[check]}
          </ChoiceTile>)}
        </div>
        <ChoiceTile name={`${id}-check`} value="notChecked" checked={rating.previousCorrectionCheck === 'notChecked'}
          onChange={() => onChange({ ...rating, previousCorrectionCheck: 'notChecked' })} variant="text">{labels.checks.notChecked}</ChoiceTile>
      </fieldset>}
      <AssessmentScale question={labels.focusQuestion} descriptions={labels.focusScale} value={rating.assessment} previousValue={previousAssessment?.assessment}
        onChange={(assessment) => onChange({ ...rating, assessment })} unable />
      <button type="button" aria-expanded={correctionVisible} aria-controls={`${id}-correction`} onClick={() => setExpanded(!expanded)}
        className="flex min-h-12 w-full items-center gap-2.5 rounded-sm border border-bd bg-surface px-3.5 py-2 text-left text-sm font-bold text-ink"><FeedbackIcon kind="plus" />{correctionLabel ?? labels.newCorrection}</button>
      {correctionVisible && <fieldset id={`${id}-correction`} className="min-w-0 space-y-3 border-t border-bd pt-3">
        <legend className="max-w-full pt-3 font-display text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{labels.correctionHeading}</legend>
        {(['problem', 'fix'] as const).map((field) => <label key={field} className="block text-[12px] font-semibold text-ink">
          {labels[field]}
          <textarea rows={2} value={rating.correction?.[field] ?? ''} maxLength={200}
            aria-invalid={!!error && !isValidCorrectionText(rating.correction?.[field] ?? '')} aria-describedby={error ? `${id}-error` : undefined}
            placeholder={field === 'problem' ? labels.problemPlaceholder : labels.fixPlaceholder}
            className="mt-1 block min-h-touch w-full resize-none border border-bd bg-input p-3 text-[16px] font-normal text-ink"
            onChange={(event) => onChange({ ...rating, correction: { problem: rating.correction?.problem ?? '', fix: rating.correction?.fix ?? '', [field]: event.target.value } })} />
        </label>)}
        <p className="text-[12px] leading-relaxed text-muted">{labels.correctionHint}</p>
      </fieldset>}
      {error && <p id={`${id}-error`} role="alert" className="text-[12px] text-crimson-ink">{error}</p>}
    </>}
  </article>
}

import { useId, useState, type ReactNode } from 'react'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import type { FocusRating, PlanWorkoutSession } from '@/domain/workout-session/workoutSession.types'
import type { ManualFocusRatingDraft } from '@/domain/workout-session/manualWorkoutEntry'
import { getPreviousCorrection, hasCompletedExercise } from '@/domain/workout-session/workoutFeedback'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { getDisciplineLabelPl } from '@/domain/discipline/disciplineLabels'
import { CorrectionNote } from './CorrectionNote'
import { isValidCorrectionText } from './validateWorkoutFeedback'
import { formatCorrectionDate, workoutFeedbackLabels as labels } from './workoutFeedbackLabels'
import type { findPreviousAssessment } from '@/domain/focus-skill/previousAssessment'
import { ChoiceTile } from '@/components/ui/ChoiceTile'
import { FeedbackIcon } from './FeedbackIcon'

export function AssessmentScale({ question, descriptions, value, onChange, unable = false, previousValue, summary = false }: {
  question: string; descriptions: readonly string[]; value: number | 'unableToRate' | null
  onChange: (value: number | 'unableToRate' | null) => void; unable?: boolean; previousValue?: number | 'unableToRate' | null
  summary?: boolean
}) {
  const name = useId()
  return <fieldset className="min-w-0 space-y-1.5">
    <legend className={summary
      ? unable ? 'mb-1.5 font-display text-[13px] font-extrabold text-ink' : 'mb-1.5 text-[11.5px] text-muted'
      : 'mb-2 font-display text-base font-extrabold text-ink'}>{question}</legend>
    <div className={summary ? 'feedback-rating-grid grid grid-cols-5 gap-1.5' : 'space-y-1.5'}>
      {descriptions.map((description, index) => {
        const level = index + 1
        const wasPrevious = previousValue === level
        return <ChoiceTile key={description} name={name} value={level}
          checked={value === level} onChange={() => onChange(level)}
          ariaLabel={`${level} ${description}${wasPrevious ? ` · ${labels.lastRating}` : ''}`}>
          {summary ? <>
            <span className="font-display text-[15px] font-extrabold tabular-nums">{level}</span>
            {wasPrevious && <span className="feedback-last-rating">{labels.lastRating}</span>}
          </> : <>
            <span className={`choice-number ${wasPrevious ? 'is-previous' : ''}`}>{level}</span>
            <span className="flex min-w-0 flex-col gap-1">{description}
              {wasPrevious && <span className="w-max rounded-sm border border-bd px-1.5 py-0.5 text-[11px] text-muted">{labels.lastRating}</span>}
            </span>
          </>}
        </ChoiceTile>
      })}
    </div>
    {summary && <p aria-live="polite" className="feedback-level">
      {typeof value === 'number' ? <span><strong className="font-display font-extrabold whitespace-nowrap tabular-nums">{labels.assessmentLevel(value)}</strong>{' '}{descriptions[value - 1]}</span>
        : <span className="text-muted">{value === 'unableToRate' ? labels.assessmentUnable : labels.assessmentPrompt}</span>}
    </p>}
    {(unable || value !== null) && <div className={summary ? 'feedback-scale-actions' : 'space-y-1.5'}>
      {unable && <ChoiceTile name={name} value="unableToRate" checked={value === 'unableToRate'} onChange={() => onChange('unableToRate')} variant="text">{labels.unable}</ChoiceTile>}
      {value !== null && <button type="button" className={summary ? 'ml-auto min-h-touch px-1 text-xs text-crimson-ink' : 'min-h-touch text-xs text-muted'}
        onClick={() => onChange(null)}>{labels.clearAssessment}</button>}
    </div>}
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
  const summary = 'stepResults' in session
  const eligible = !summary || (rating.workoutItemId !== null && hasCompletedExercise(session, rating.workoutItemId))
  const blockLabel = rating.blockType ? getWorkoutBlockLabelPl(rating.blockType) : labels.focusHeading
  const previousLabel = previousAssessment && labels.previousAssessment(
    typeof previousAssessment.assessment === 'number' ? `${previousAssessment.assessment}/5` : labels.unable,
    formatCorrectionDate(previousAssessment.workoutDate),
    getWorkoutBlockLabelPl(previousAssessment.blockType),
  )
  return <article aria-labelledby={`${id}-name`} className={`min-w-0 space-y-3 rounded-sm border border-bd bg-surface ${summary ? 'p-3.5' : 'p-4'}`}>
    {summary ? <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="feedback-badge is-context">{labels.focusContext(getDisciplineLabelPl(session.disciplineKey), blockLabel)}</span>
        {previousLabel && <span className="feedback-badge tabular-nums">{previousLabel}</span>}
        {!eligible && <span className="feedback-badge"><FeedbackIcon kind="skip" size={12} />{labels.skipped}</span>}
      </div>
      <h3 id={`${id}-name`} className={`wrap-anywhere font-display text-base leading-tight font-extrabold tracking-tight ${eligible ? 'text-ink' : 'text-muted'}`}>{rating.skillNameSnapshot}</h3>
    </div> : <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-[11px] font-bold tracking-[0.1em] text-crimson-ink uppercase">{blockLabel}</p>
      </div>
      <h3 id={`${id}-name`} className="mt-1 break-words font-display text-xl leading-snug font-extrabold text-ink">{rating.skillNameSnapshot}</h3>
    </div>}
    {summary ? <div className="flex min-h-9 items-center gap-2 rounded-xs border border-bd bg-elevated px-2.5 py-1.5">
      <span className="feedback-badge is-active">{labels.criterion}</span>
      <p className={`min-w-0 wrap-anywhere text-xs leading-snug font-semibold ${eligible ? 'text-ink' : 'text-muted'}`}>{rating.criterionSnapshot}</p>
    </div> : <div className="flex gap-2.5 rounded-sm border border-bd bg-elevated p-3">
      <FeedbackIcon kind="goal" className={eligible ? 'mt-0.5 text-ember' : 'mt-0.5 text-muted'} />
      <div className="min-w-0">
        <p className={`text-[11px] font-bold uppercase tracking-widest ${eligible ? 'text-ember-ink' : 'text-muted'}`}>{labels.criterion}</p>
        <p className={`mt-0.5 break-words text-[15px] leading-relaxed ${eligible ? 'text-ink' : 'text-muted'}`}>{rating.criterionSnapshot}</p>
      </div>
    </div>}
    {children}
    {!summary && previousAssessment && <p className="w-fit rounded-sm border border-bd px-2 py-1 text-xs text-muted">Ostatnio <strong className="text-ink">{typeof previousAssessment.assessment === 'number' ? `${previousAssessment.assessment}/5` : labels.unable}</strong> · {formatCorrectionDate(previousAssessment.workoutDate)} · {getWorkoutBlockLabelPl(previousAssessment.blockType)}</p>}
    {previous && <CorrectionNote correction={previous} summary={summary} />}
    {!eligible ? <div className="flex items-start gap-2.5 rounded-sm border border-bd bg-elevated p-3">
      <FeedbackIcon kind="skip" className="text-muted" />
      <div><p className="text-sm font-bold text-ink">{labels.skippedHeading}</p><p className="mt-0.5 text-xs leading-relaxed text-muted">{labels.skippedHint}</p></div>
    </div> : <>
      {previous && <fieldset className="min-w-0">
        <legend className={`font-display font-extrabold text-ink ${summary ? 'mb-1.5 text-[13px]' : 'mb-2 text-base'}`}>{labels.todayQuestion}</legend>
        <div className={`grid grid-cols-2 ${summary ? 'feedback-repeat-grid gap-1.5' : 'gap-2'}`}>
          {(['better', 'same'] as const).map((check) => <ChoiceTile key={check} name={`${id}-check`} value={check}
            checked={rating.previousCorrectionCheck === check} onChange={() => onChange({ ...rating, previousCorrectionCheck: check })} className="correction-option">
            {!summary && <FeedbackIcon kind={check} size={28} className={check === 'better' ? 'text-success-ink' : 'text-muted'} />}{labels.checks[check]}
          </ChoiceTile>)}
          {summary && <ChoiceTile name={`${id}-check`} value="notChecked" checked={rating.previousCorrectionCheck === 'notChecked'}
            onChange={() => onChange({ ...rating, previousCorrectionCheck: 'notChecked' })} className="col-span-2">{labels.checks.notChecked}</ChoiceTile>}
        </div>
        {!summary && <ChoiceTile name={`${id}-check`} value="notChecked" checked={rating.previousCorrectionCheck === 'notChecked'}
          onChange={() => onChange({ ...rating, previousCorrectionCheck: 'notChecked' })} variant="text">{labels.checks.notChecked}</ChoiceTile>}
      </fieldset>}
      <AssessmentScale question={labels.focusQuestion} descriptions={labels.focusScale} value={rating.assessment} previousValue={previousAssessment?.assessment} summary={summary}
        onChange={(assessment) => onChange({ ...rating, assessment })} unable />
      <button type="button" aria-expanded={correctionVisible} aria-controls={`${id}-correction`} onClick={() => setExpanded(!expanded)}
        className={summary
          ? 'feedback-note-toggle motion-press'
          : 'flex min-h-12 w-full items-center gap-2.5 rounded-sm border border-bd bg-surface px-3.5 py-2 text-left text-sm font-bold text-ink'}><FeedbackIcon kind="plus" size={summary ? 14 : 18} />{correctionLabel ?? labels.newCorrection}</button>
      {correctionVisible && <div className={summary ? 'rounded-sm border border-bd bg-elevated p-3' : ''}>
        <fieldset id={`${id}-correction`} className={`min-w-0 ${summary ? 'space-y-2' : 'space-y-3 border-t border-bd pt-3'}`}>
        <legend className={`max-w-full font-display uppercase ${summary
          ? 'mb-2 text-xs font-extrabold tracking-wide text-ink'
          : 'pt-3 text-[10px] font-semibold tracking-[0.08em] text-muted'}`}>{labels.correctionHeading}</legend>
        {(['problem', 'fix'] as const).map((field) => <label key={field} className="block text-[12px] font-semibold text-ink">
          {labels[field]}
          <textarea rows={2} value={rating.correction?.[field] ?? ''} maxLength={200}
            aria-invalid={!!error && !isValidCorrectionText(rating.correction?.[field] ?? '')} aria-describedby={error ? `${id}-error` : undefined}
            placeholder={field === 'problem' ? labels.problemPlaceholder : labels.fixPlaceholder}
            className={summary ? 'feedback-textarea mt-1 min-h-touch' : 'mt-1 block min-h-touch w-full resize-none border border-bd bg-input p-3 text-[16px] font-normal text-ink'}
            onChange={(event) => onChange({ ...rating, correction: { problem: rating.correction?.problem ?? '', fix: rating.correction?.fix ?? '', [field]: event.target.value } })} />
        </label>)}
        <p className={summary ? 'text-[11px] leading-snug text-muted italic' : 'text-[12px] leading-relaxed text-muted'}>{labels.correctionHint}</p>
      </fieldset></div>}
      {error && <p id={`${id}-error`} role="alert" className="text-[12px] text-crimson-ink">{error}</p>}
    </>}
  </article>
}

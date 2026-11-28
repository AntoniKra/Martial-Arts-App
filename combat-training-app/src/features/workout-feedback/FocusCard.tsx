import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
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
import { AssessmentScale } from './AssessmentScale'

export function FocusCard<T extends FocusRating | ManualFocusRatingDraft>({ session, rating, skills, first, onChange, error, children, correctionLabel, previousAssessment }: {
  session: PlanWorkoutSession | Pick<PlanWorkoutSession, 'id' | 'workoutDate'>; rating: T; skills: readonly FocusSkill[]; first: boolean
  onChange: (rating: T) => void; error?: string; children?: ReactNode; correctionLabel?: string
  previousAssessment?: ReturnType<typeof findPreviousAssessment>
}) {
  const id = useId()
  const [expanded, setExpanded] = useState(rating.correction !== null)
  const [editingAssessment, setEditingAssessment] = useState(false)
  const correctionVisible = expanded || !!error
  const addNoteButton = useRef<HTMLButtonElement>(null)
  const problemInput = useRef<HTMLTextAreaElement>(null)
  const moveCorrectionFocus = useRef(false)
  const scale = useRef<HTMLFieldSetElement>(null)
  const changeButton = useRef<HTMLButtonElement>(null)
  const moveAssessmentFocus = useRef<'change' | 'selection' | null>(null)
  const previous = first ? getPreviousCorrection(session, skills.find((skill) => skill.id === rating.focusSkillId)) : null
  const summary = 'stepResults' in session
  const eligible = !summary || (rating.workoutItemId !== null && hasCompletedExercise(session, rating.workoutItemId))
  const assessment = rating.assessment
  const collapsed = summary && eligible && assessment !== null && !editingAssessment && !error
  const assessmentLevel = typeof assessment === 'number' ? labels.assessmentLevel(assessment) : labels.unable
  const assessmentDescription = typeof assessment === 'number' ? labels.focusScale[assessment - 1] : null
  const assessmentSummary = assessmentDescription ? `${assessmentLevel} · ${assessmentDescription}` : assessmentLevel
  const blockLabel = rating.blockType ? getWorkoutBlockLabelPl(rating.blockType) : labels.focusHeading
  const previousLabel = previousAssessment && labels.previousAssessment(
    typeof previousAssessment.assessment === 'number' ? `${previousAssessment.assessment}/5` : labels.unable,
    formatCorrectionDate(previousAssessment.workoutDate),
    getWorkoutBlockLabelPl(previousAssessment.blockType),
  )
  useLayoutEffect(() => {
    if (!moveCorrectionFocus.current) return
    moveCorrectionFocus.current = false
    const target = correctionVisible ? problemInput.current : addNoteButton.current
    target?.focus()
  }, [correctionVisible])

  useLayoutEffect(() => {
    if (moveAssessmentFocus.current === 'change' && collapsed) {
      moveAssessmentFocus.current = null
      changeButton.current?.focus()
    } else if (moveAssessmentFocus.current === 'selection' && !collapsed) {
      moveAssessmentFocus.current = null
      scale.current?.querySelector<HTMLInputElement>('input:checked')?.focus()
    }
  }, [collapsed])

  function finishAssessment() {
    moveAssessmentFocus.current = 'change'
    setEditingAssessment(false)
  }

  function changeAssessment(value: FocusRating['assessment']) {
    if (summary && value !== null) finishAssessment()
    onChange({ ...rating, assessment: value })
  }

  function updateDetails(edited: T) {
    // Keep the card open when the user starts correcting a validation error.
    if (summary && error) setEditingAssessment(true)
    onChange(edited)
  }

  return <article aria-labelledby={`${id}-name`} className={`feedback-focus-card feedback-surface${collapsed ? ' is-collapsed' : ''}`}>
    <div className="min-w-0 space-y-1">
      {!collapsed && <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-[1.3]">
        <span className="font-display text-[10.5px] font-extrabold tracking-[0.07em] text-ember-ink uppercase">{summary ? labels.focusContext(getDisciplineLabelPl(session.disciplineKey), blockLabel) : blockLabel}</span>
        {previousLabel && <><span aria-hidden="true" className="text-faint">·</span><span className="font-medium tabular-nums text-muted">{previousLabel}</span></>}
        {!eligible && <span className="feedback-badge"><FeedbackIcon kind="skip" size={12} />{labels.skipped}</span>}
      </div>}
      <h3 id={`${id}-name`} className={`wrap-anywhere font-display text-lg leading-[1.18] font-extrabold tracking-[-0.01em] ${eligible ? 'text-ink' : 'text-muted'}`}>{rating.skillNameSnapshot}</h3>
    </div>
    {collapsed && <button ref={changeButton} type="button" aria-expanded={false} aria-controls={`${id}-details`}
      aria-label={labels.changeAssessmentLabel(rating.skillNameSnapshot, assessmentSummary)} className="feedback-collapsed-row"
      onClick={() => {
        moveAssessmentFocus.current = 'selection'
        setEditingAssessment(true)
      }}>
      <span aria-hidden="true" className="min-w-0 flex-1 truncate text-muted">
        <strong className="font-display font-extrabold tabular-nums text-ink">{assessmentLevel}</strong>
        {assessmentDescription && ` · ${assessmentDescription}`}
      </span>
      <span aria-hidden="true" className="flex shrink-0 gap-1.5"><span className="text-faint">·</span>
        <span className="font-display text-xs font-extrabold text-crimson-ink">{labels.changeAssessment}</span>
      </span>
    </button>}
    <div id={`${id}-details`} hidden={collapsed} className="feedback-focus-details">
      <div className={`min-w-0 space-y-0.5 border-l-2 py-px pl-2.5 ${eligible ? 'border-crimson-ink text-ink' : 'border-bd text-muted'}`}>
        <p className={`font-display text-[10px] font-extrabold tracking-widest uppercase ${eligible ? 'text-crimson-ink' : 'text-muted'}`}>{labels.criterion}</p>
        <p className="wrap-anywhere text-[13px] leading-[1.4] font-medium">{rating.criterionSnapshot}</p>
      </div>
      {children}
      {previous && <div className="feedback-card-section">
        <CorrectionNote correction={previous} feedback />
        {eligible && <fieldset className="min-w-0">
          <legend className="mb-2 font-display text-[13.5px] font-extrabold text-ink">{labels.todayQuestion}</legend>
          <div className="feedback-repeat-grid grid grid-cols-2 gap-1.5">
            {(['better', 'same'] as const).map((check) => <ChoiceTile key={check} name={`${id}-check`} value={check}
              checked={rating.previousCorrectionCheck === check} onChange={() => updateDetails({ ...rating, previousCorrectionCheck: check })} className="correction-option">
              {labels.checks[check]}
            </ChoiceTile>)}
            <ChoiceTile name={`${id}-check`} value="notChecked" checked={rating.previousCorrectionCheck === 'notChecked'}
              onChange={() => updateDetails({ ...rating, previousCorrectionCheck: 'notChecked' })} className="col-span-2">{labels.checks.notChecked}</ChoiceTile>
          </div>
        </fieldset>}
      </div>}
      {!eligible ? <div className="feedback-skipped-line">
        <FeedbackIcon kind="skip" className="mt-0.5 shrink-0 text-muted" />
        <div><p className="text-[13.5px] font-bold text-ink">{labels.skippedHeading}</p><p className="mt-0.5 text-xs leading-relaxed text-muted">{labels.skippedHint}</p></div>
      </div> : <>
        <div className="feedback-card-section">
          <AssessmentScale question={labels.focusQuestion} descriptions={labels.focusScale} value={assessment} previousValue={previousAssessment?.assessment}
            onChange={changeAssessment} scaleRef={scale} onConfirmSelection={summary && !error ? finishAssessment : undefined} unable />
        </div>
        <div className="feedback-card-section">
          {(!summary || !correctionVisible) && <button ref={addNoteButton} type="button" aria-expanded={correctionVisible}
            aria-controls={correctionVisible ? `${id}-correction` : undefined} onClick={() => {
              moveCorrectionFocus.current = summary
              setExpanded(!expanded)
            }}
            className="feedback-note-toggle"><FeedbackIcon kind="plus" size={15} className="shrink-0 text-crimson-ink" />{correctionLabel ?? labels.newCorrection}</button>}
          {correctionVisible && <fieldset id={`${id}-correction`} aria-describedby={summary ? `${id}-correction-description` : undefined} className="min-w-0 space-y-2">
              <legend className="max-w-full font-display text-[13.5px] font-extrabold text-ink">
                {summary ? labels.correctionTitle : labels.correctionHeading}
              </legend>
              {summary && <p id={`${id}-correction-description`} className="text-[11px] text-muted">{labels.correctionDescription}</p>}
              {(['problem', 'fix'] as const).map((field) => <label key={field} className="block text-[12px] font-semibold text-ink">
                {labels[field]}
                <textarea ref={field === 'problem' ? problemInput : undefined} rows={2} value={rating.correction?.[field] ?? ''} maxLength={200}
                  aria-invalid={!!error && !isValidCorrectionText(rating.correction?.[field] ?? '')} aria-describedby={error ? `${id}-error` : undefined}
                  placeholder={field === 'problem' ? labels.problemPlaceholder : labels.fixPlaceholder}
                  className="feedback-textarea mt-1 min-h-touch"
                onChange={(event) => updateDetails({ ...rating, correction: { problem: rating.correction?.problem ?? '', fix: rating.correction?.fix ?? '', [field]: event.target.value } })} />
              </label>)}
              <p className="text-[11.5px] leading-snug text-muted italic">{labels.correctionHint}</p>
              {summary && <button type="button" className="min-h-touch px-1 text-xs text-crimson-ink" onClick={() => {
                moveCorrectionFocus.current = true
                setExpanded(false)
              updateDetails({ ...rating, correction: null })
              }}>{labels.removeCorrection}</button>}
          </fieldset>}
          {error && <p id={`${id}-error`} role="alert" className="text-[12px] text-crimson-ink">{error}</p>}
        </div>
      </>}
    </div>
  </article>
}

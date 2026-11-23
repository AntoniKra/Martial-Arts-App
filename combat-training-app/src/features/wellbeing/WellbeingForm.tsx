import { useEffect, useId, useReducer, useRef, useState } from 'react'
import { validateWellbeing, WELLBEING_FIELDS, WELLBEING_NOTE_LIMIT, WELLBEING_QUESTIONS_VERSION, type WellbeingEntry } from '@/domain/wellbeing/wellbeing'
import { wellbeingLabels as labels, wellbeingQuestions } from './wellbeingLabels'
import { countWellbeingAnswers, startWellbeingWizard, wellbeingWizardReducer } from './wellbeingWizard'
import { BackButton } from '@/components/ui/BackButton'

function Check({ size }: { size: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={size === 10 ? 3 : 2.5}><path d="m4 12 5 5L20 6" /></svg>
}

function NextChevron() {
  return <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
}

export function WellbeingForm({ date, entry, onSave, onClose, onSkip }: {
  date: string; entry?: WellbeingEntry; onSave: (entry: WellbeingEntry) => Promise<void>; onClose?: () => void; onSkip?: () => void
}) {
  const [{ step, answers, note }, dispatch] = useReducer(wellbeingWizardReducer, entry, startWellbeingWizard)
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false)
  const pending = useRef(false), id = useId()
  const stepHeading = useRef<HTMLHeadingElement>(null)
  const previousStep = useRef(step)
  const field = WELLBEING_FIELDS.at(step)
  const question = field && wellbeingQuestions[field]
  const value = field ? answers[field] : null
  const answered = countWellbeingAnswers(answers)
  const total = WELLBEING_FIELDS.length
  const progress = labels.progressValue(answered, total)

  useEffect(() => {
    if (previousStep.current !== step) {
      previousStep.current = step
      stepHeading.current?.focus()
    }
  }, [step])

  return <form aria-label={labels.title} className="wellbeing-form-body" onSubmit={(event) => {
    event.preventDefault()
    if (field || pending.current) return
    if (!validateWellbeing(answers, note)) { setError(labels.invalid); return }
    pending.current = true; setBusy(true); setError(null)
    const now = new Date().toISOString()
    void onSave({ date, sleep: answers.sleep!, energy: answers.energy!, soreness: answers.soreness!, stress: answers.stress!,
      note: note.trim() || null, questionsVersion: WELLBEING_QUESTIONS_VERSION, createdAt: entry?.createdAt ?? now, updatedAt: now })
      .then(() => { onClose?.() }).catch(() => setError(labels.failed)).finally(() => { pending.current = false; setBusy(false) })
  }}>
    <div className="layout-c-progress-bar-wrap">
      <div className="layout-c-progress-meta" aria-hidden="true"><span>{labels.progress}</span><span>{progress}</span></div>
      <div className="layout-c-track" role="progressbar" aria-label={labels.progress} aria-valuemin={0}
        aria-valuemax={total} aria-valuenow={answered} aria-valuetext={progress}>
        <div className="layout-c-fill" style={{ width: `${answered / total * 100}%` }} />
      </div>
    </div>
    {field && question
      ? <div className="question-card" key={field}>
        <div className="question-header">
          <span className="question-cat-tag">{question.name}</span>
          <h3 id={`${id}-question`} className="question-text" tabIndex={-1} ref={stepHeading}>{question.question}</h3>
        </div>
        <div className="scale-control-1a">
          <div className="scale-1a-grid" role="radiogroup" aria-labelledby={`${id}-question`}>
            {question.options.map((option, index) => {
              const score = index + 1
              return <label key={score} className="scale-1a-option">
                <input className="choice-radio" type="radio" name={`${id}-${field}`} value={score} checked={value === score}
                  aria-label={`${score} · ${option}`} disabled={busy} onChange={() => dispatch({ type: 'answer', field, value: score })} />
                <span className={`scale-1a-btn${value === score ? ' is-selected' : ''}`} aria-hidden="true">
                  <span className="btn-num">{score}</span>
                  {value === score && <Check size={10} />}
                </span>
              </label>
            })}
          </div>
          <p className="scale-1a-selected-banner">
            <span className="scale-1a-selected-num">{value ?? '—'}</span>{' · '}
            <span>{value === null ? labels.noSelection : question.options[value - 1]}</span>
          </p>
          <div className="scale-1a-meta-row" aria-hidden="true">
            <span>1 · {question.options[0]}</span><span>5 · {question.options[4]}</span>
          </div>
        </div>
      </div>
      : <div className="note-area-group">
        <div className="note-header-row">
          <h3 className="note-label" tabIndex={-1} ref={stepHeading}><label htmlFor={`${id}-note`}>{labels.note}</label></h3>
          <span className="note-counter" id={`${id}-count`}>{note.length} / {WELLBEING_NOTE_LIMIT}</span>
        </div>
        <textarea id={`${id}-note`} className="note-textarea" rows={1} value={note} maxLength={WELLBEING_NOTE_LIMIT}
          placeholder={labels.noteExample} disabled={busy} aria-describedby={`${id}-hint ${id}-count`}
          onChange={(event) => dispatch({ type: 'note', value: event.target.value })} />
        <p id={`${id}-hint`} className="note-hint">{labels.noteHint}</p>
      </div>}
    <div className="wizard-nav-buttons">
      <BackButton showLabel className="btn-wizard-prev" disabled={step === 0 || busy} onClick={() => dispatch({ type: 'back' })} />
      {question && <>
        <button type="button" className="btn-wizard-next" disabled={busy} aria-disabled={value === null || undefined}
          aria-describedby={value === null ? `${id}-next-hint` : undefined} onClick={() => dispatch({ type: 'next' })}>
          {labels.next}<NextChevron />
        </button>
        {value === null && <span id={`${id}-next-hint`} className="sr-only">{labels.nextDisabled}</span>}
      </>}
    </div>
    {/* "Nie dziś" skips the whole day, so it must not require answering the four questions first. */}
    {question && onSkip && <button type="button" disabled={busy} className="btn-skip-3a self-center" onClick={onSkip}>{labels.skip}</button>}
    {error && <p role="alert" className="text-sm">{error}</p>}
    {!question && <div className="save-variant-3a">
      <button type="submit" disabled={busy} className="btn-save-3a"><Check size={16} />{labels.save}</button>
      {onSkip && <button type="button" className="btn-skip-3a" onClick={onSkip}>{labels.skip}</button>}
    </div>}
    {onClose && <button type="button" disabled={busy} className="btn-skip-3a self-center" onClick={onClose}>{labels.cancel}</button>}
  </form>
}

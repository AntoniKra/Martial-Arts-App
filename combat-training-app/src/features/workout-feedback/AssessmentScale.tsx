import { useId, useRef } from 'react'
import { workoutFeedbackLabels as labels } from './workoutFeedbackLabels'
import './workoutFeedback.css'

export type AssessmentValue = number | 'unableToRate' | null

export function AssessmentScale({ question, descriptions, value, onChange, unable = false, previousValue, hideLegend = false }: {
  question: string
  descriptions: readonly string[]
  value: AssessmentValue
  onChange: (value: AssessmentValue) => void
  unable?: boolean
  previousValue?: AssessmentValue
  hideLegend?: boolean
}) {
  const name = useId()
  const firstOption = useRef<HTMLInputElement>(null)
  return <fieldset className="min-w-0">
    <legend className={hideLegend ? 'sr-only' : 'mb-2 font-display text-[13.5px] font-extrabold text-ink'}>{question}</legend>
    <div className="feedback-rating-grid">
      {descriptions.map((description, index) => {
        const level = index + 1
        const wasPrevious = previousValue === level
        return <label key={level} className="feedback-rating-slot">
          <input ref={level === 1 ? firstOption : undefined}
            className="choice-radio" type="radio" name={name} value={level} checked={value === level}
            onChange={() => onChange(level)} aria-label={`${level} ${description}${wasPrevious ? ` · ${labels.lastRating}` : ''}`} />
          <span className={`feedback-rating-bar${typeof value === 'number' && level < value ? ' is-below' : ''}`}
            style={{ height: 32 + index * 10 }} aria-hidden="true">
            {level}
            {wasPrevious && <span className="feedback-rating-previous">{labels.lastRating}</span>}
          </span>
        </label>
      })}
    </div>
    <p aria-live="polite" className={`feedback-level${typeof value === 'number' ? ' is-selected' : ''}`}>
      {typeof value === 'number'
        ? <span><strong className="font-display font-extrabold whitespace-nowrap tabular-nums">{labels.assessmentLevel(value)}</strong>{' '}{descriptions[value - 1]}</span>
        : value === 'unableToRate' ? labels.assessmentUnable : labels.assessmentPrompt}
    </p>
    {(unable || value !== null) && <div className="feedback-scale-actions">
      {unable && <label className="feedback-unable">
        <input className="choice-radio" type="radio" name={name}
          value="unableToRate" checked={value === 'unableToRate'} onChange={() => onChange('unableToRate')} />
        <span>{labels.unable}</span>
      </label>}
      {value !== null && <button type="button" className="feedback-clear-assessment" onClick={() => {
        firstOption.current?.focus()
        onChange(null)
      }}>{labels.clearAssessment}</button>}
    </div>}
  </fieldset>
}

import { useEffect, useId, useRef, type KeyboardEvent } from 'react'

import { exerciseConfigurationLabels as labels } from '@/features/workout-builder/exerciseConfigurationLabels'
import { canStep, type StepDirection, type StepperField } from '@/features/workout-builder/state/exerciseStepper'

export interface StepperEntry {
  field: StepperField
  text: string
  invalid: boolean
}

interface ExerciseValueStepperProps {
  field: StepperField
  label: string
  value: number
  display: string
  entry: StepperEntry | null
  timePreview: string | null
  errorId: string
  wide?: boolean
  layout?: 'stacked' | 'side'
  stepLabels?: { decrease: string; increase: string }
  entryHint?: string
  onStep: (direction: StepDirection) => void
  onEntryStart: () => void
  onEntryChange: (text: string) => void
  onEntryCommit: () => void
  onEntryCancel: () => void
  onEntryBlur?: (relatedTarget: EventTarget | null) => void
}

/** Stepper tile N4 C (stacked) or P2 B (side): underlined value (tap to type) and flat −/+ buttons with M5 corners. */
export function ExerciseValueStepper({
  field,
  label,
  value,
  display,
  entry,
  timePreview,
  errorId,
  wide = false,
  layout = 'stacked',
  stepLabels,
  entryHint,
  onStep,
  onEntryStart,
  onEntryChange,
  onEntryCommit,
  onEntryCancel,
  onEntryBlur,
}: ExerciseValueStepperProps) {
  const labelId = useId()
  const previewId = useId()
  const valueRef = useRef<HTMLButtonElement>(null)
  const editing = entry?.field === field
  // Enter and Esc return focus to the value; a tap elsewhere leaves focus where the user put it.
  const shouldRestoreFocus = useRef(false)

  useEffect(() => {
    if (editing) shouldRestoreFocus.current = false
  }, [editing, entry])

  useEffect(() => {
    if (!editing && shouldRestoreFocus.current) {
      shouldRestoreFocus.current = false
      valueRef.current?.focus()
    }
  }, [editing])

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      shouldRestoreFocus.current = true
      onEntryCommit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      shouldRestoreFocus.current = true
      onEntryCancel()
    }
  }

  const isLong = layout === 'side' && (editing ? entry.text.length : display.length) >= 6

  const stepButton = (direction: StepDirection) => {
    const enabled = canStep(field, value, direction)
    const buttonText = direction === 1 ? (stepLabels?.increase ?? '+') : (stepLabels?.decrease ?? '−')
    return (
      <button
        type="button"
        className="exercise-config-step m5-corners"
        data-stepper-action="step"
        aria-label={direction === 1 ? labels.increase[field] : labels.decrease[field]}
        aria-disabled={!enabled}
        onClick={() => { if (enabled) onStep(direction) }}
      >
        <span aria-hidden="true">{buttonText}</span>
      </button>
    )
  }

  const valueControl = editing ? (
    <input
      // The value was tapped to type a new one, so the field takes focus at once.
      autoFocus
      className="exercise-config-stepper-value exercise-config-stepper-input"
      data-long={isLong || undefined}
      aria-label={label}
      inputMode={field === 'roundCount' ? 'numeric' : 'text'}
      enterKeyHint="done"
      autoComplete="off"
      value={entry.text}
      aria-invalid={entry.invalid || undefined}
      aria-describedby={entry.invalid ? errorId : timePreview ? previewId : undefined}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => onEntryChange(event.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        if (shouldRestoreFocus.current) return
        if (onEntryBlur) onEntryBlur(event.relatedTarget)
        else onEntryCommit()
      }}
    />
  ) : (
    <button
      ref={valueRef}
      type="button"
      className="exercise-config-stepper-value"
      data-long={isLong || undefined}
      aria-label={labels.editValue(label, display)}
      onClick={onEntryStart}
    >
      <span className="exercise-config-stepper-face">{display}</span>
    </button>
  )

  if (layout === 'side') {
    return (
      <div role="group" aria-labelledby={labelId} className="break-stepper-wrap">
        <span id={labelId} className="exercise-config-stepper-label break-stepper-label">{label}</span>
        <div className="break-stepper-row">
          {stepButton(-1)}
          <div className="break-stepper-mid">
            {editing ? <div className="break-stepper-input-wrap">{valueControl}</div> : valueControl}
            {editing && field !== 'roundCount' && (
              <output className="exercise-config-stepper-preview break-stepper-preview">
                <span id={previewId}>{timePreview}</span>
              </output>
            )}
            {editing && entryHint && <p className="break-stepper-hint">{entryHint}</p>}
          </div>
          {stepButton(1)}
        </div>
        <span className="sr-only" aria-live="polite">{`${label}: ${display}`}</span>
      </div>
    )
  }

  return (
    <div role="group" aria-labelledby={labelId} className="exercise-config-stepper" data-wide={wide || undefined}>
      <span id={labelId} className="exercise-config-stepper-label">{label}</span>
      {valueControl}
      {editing && field !== 'roundCount' && (
        <output className="exercise-config-stepper-preview">
          <span id={previewId}>{timePreview}</span>
        </output>
      )}
      <div className="exercise-config-stepper-buttons">
        {stepButton(-1)}
        {stepButton(1)}
      </div>
      <span className="sr-only" aria-live="polite">{`${label}: ${display}`}</span>
    </div>
  )
}

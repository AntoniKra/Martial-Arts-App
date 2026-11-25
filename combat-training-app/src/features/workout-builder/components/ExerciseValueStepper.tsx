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
  errorId: string
  wide?: boolean
  onStep: (direction: StepDirection) => void
  onEntryStart: () => void
  onEntryChange: (text: string) => void
  onEntryCommit: () => void
  onEntryCancel: () => void
}

/** Stepper tile N4 C: underlined value (tap to type) and flat −/+ buttons with M5 corners. */
export function ExerciseValueStepper({
  field,
  label,
  value,
  display,
  entry,
  errorId,
  wide = false,
  onStep,
  onEntryStart,
  onEntryChange,
  onEntryCommit,
  onEntryCancel,
}: ExerciseValueStepperProps) {
  const labelId = useId()
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
      shouldRestoreFocus.current = true
      onEntryCancel()
    }
  }

  const stepButton = (direction: StepDirection) => {
    const enabled = canStep(field, value, direction)
    return (
      <button
        type="button"
        className="exercise-config-step m5-corners"
        aria-label={direction === 1 ? labels.increase[field] : labels.decrease[field]}
        aria-disabled={!enabled}
        onClick={() => { if (enabled) onStep(direction) }}
      >
        <span aria-hidden="true">{direction === 1 ? '+' : '−'}</span>
      </button>
    )
  }

  return (
    <div role="group" aria-labelledby={labelId} className="exercise-config-stepper" data-wide={wide || undefined}>
      <span id={labelId} className="exercise-config-stepper-label">{label}</span>
      {editing ? (
        <input
          // The value was tapped to type a new one, so the field takes focus at once.
          autoFocus
          className="exercise-config-stepper-value exercise-config-stepper-input"
          aria-label={label}
          inputMode={field === 'roundCount' ? 'numeric' : 'text'}
          enterKeyHint="done"
          autoComplete="off"
          value={entry.text}
          aria-invalid={entry.invalid || undefined}
          aria-describedby={entry.invalid ? errorId : undefined}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => onEntryChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (!shouldRestoreFocus.current) onEntryCommit() }}
        />
      ) : (
        <button
          ref={valueRef}
          type="button"
          className="exercise-config-stepper-value"
          aria-label={labels.editValue(label, display)}
          onClick={onEntryStart}
        >
          <span className="exercise-config-stepper-face">{display}</span>
        </button>
      )}
      <div className="exercise-config-stepper-buttons">
        {stepButton(-1)}
        {stepButton(1)}
      </div>
      <span className="sr-only" aria-live="polite">{`${label}: ${display}`}</span>
    </div>
  )
}

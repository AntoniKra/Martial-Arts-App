import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'

import { screenHeaderLabels } from '@/components/screenHeaderLabels'
import { TimelineCloseIcon } from '@/features/workout-builder/components/BlockTypeIcon'
import { ExerciseValueStepper } from '@/features/workout-builder/components/ExerciseValueStepper'
import { exerciseConfigurationLabels as stepperLabels } from '@/features/workout-builder/exerciseConfigurationLabels'
import { parseStepperEntry, type StepDirection } from '@/features/workout-builder/state/exerciseStepper'
import {
  BREAK_DURATION_PRESETS,
  commitBreakEntry,
  DEFAULT_BREAK_DURATION_SECONDS,
  normalizeBreakInstruction,
  resolveBreakSubmit,
  stepBreakDuration,
  type BreakEntryState,
} from '@/features/workout-builder/state/workoutBreakForm'
import { BREAK_INSTRUCTION_MAX_LENGTH } from '@/features/workout-builder/state/workoutBuilder.types'
import { formatBreakDuration } from '@/features/workout-builder/utils/formatBreakDuration'
import { workoutBuilderLabels as labels } from '@/features/workout-builder/workoutBuilderLabels'
import './workoutBreakSheet.css'

interface WorkoutBreakSheetProps {
  mode: 'add' | 'edit'
  initialDurationSeconds?: number
  initialInstruction?: string | null
  onSubmit: (durationSeconds: number, instruction: string | null) => void
  onCancel: () => void
}

/** Bottom sheet for adding and editing a standalone break in the plan builder (issue 274, P1 A · P2 B · P3 B · P4 A). */
export function WorkoutBreakSheet({
  mode,
  initialDurationSeconds = DEFAULT_BREAK_DURATION_SECONDS,
  initialInstruction = null,
  onSubmit,
  onCancel,
}: WorkoutBreakSheetProps) {
  const baseId = useId()
  const titleId = `${baseId}-title`
  const instructionId = `${baseId}-instruction`
  const errorId = `${baseId}-error`

  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [durationSeconds, setDurationSeconds] = useState(initialDurationSeconds)
  const [entry, setEntry] = useState<BreakEntryState | null>(null)
  const [instructionInput, setInstructionInput] = useState(initialInstruction ?? '')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    if (!dialog.open) dialog.showModal()
    closeButtonRef.current?.focus()

    return () => {
      if (dialog.open) dialog.close()
      document.documentElement.style.overflow = previousOverflow
    }
  }, [])

  const entryResult = entry ? parseStepperEntry('rest', entry.text) : null
  const display = formatBreakDuration(durationSeconds)
  const timePreview = entry && !entry.invalid && entryResult?.ok ? formatBreakDuration(entryResult.value) : null
  const errorMessage = entry?.invalid
    ? entry.error === 'zero'
      ? labels.breakZeroDurationError
      : stepperLabels.entryErrors.rest
    : null

  function handlePresetSelect(presetSeconds: number) {
    setDurationSeconds(presetSeconds)
    setEntry(null)
  }

  function handleStep(direction: StepDirection) {
    setDurationSeconds(stepBreakDuration(durationSeconds, entry, direction))
    setEntry(null)
  }

  function handleEntryCommit() {
    if (!entry) return
    const result = commitBreakEntry(entry.text)
    if (result.ok) {
      setDurationSeconds(result.durationSeconds)
      setEntry(null)
    } else {
      setEntry(result.entry)
    }
  }

  function handleEntryBlur(relatedTarget: EventTarget | null) {
    if (relatedTarget instanceof Element && relatedTarget.closest('[data-break-sheet-action], [data-stepper-action]')) {
      return
    }
    handleEntryCommit()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = resolveBreakSubmit(durationSeconds, entry)
    if (!result.ok) {
      setDurationSeconds(result.durationSeconds)
      setEntry(result.entry)
      return
    }
    setEntry(null)
    onSubmit(result.durationSeconds, normalizeBreakInstruction(instructionInput))
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return
    const controls = [
      ...event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled)',
      ),
    ]
    const first = controls[0]
    const last = controls.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  const title = mode === 'edit' ? labels.editBreakTitle : labels.breakLabel

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="break-sheet"
      onCancel={(event) => {
        event.preventDefault()
        if (entry) {
          setEntry(null)
          return
        }
        onCancel()
      }}
      onKeyDown={handleDialogKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div className="break-sheet-content">
        <header className="wb-topbar">
          <button
            ref={closeButtonRef}
            type="button"
            data-break-sheet-action="close"
            className="wb-topbar-close"
            aria-label={screenHeaderLabels.close}
            onClick={onCancel}
          >
            <TimelineCloseIcon size={22} />
          </button>
          <h2 id={titleId} className="wb-topbar-title">{title}</h2>
          <div className="wb-topbar-slot" />
        </header>

        <form onSubmit={handleSubmit} className="break-sheet-form" noValidate>
          <fieldset className="break-sheet-section">
            <legend className="break-sheet-section-title">{labels.breakFormats}</legend>
            <div className="break-sheet-presets">
              {BREAK_DURATION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  data-break-sheet-action="preset"
                  className="break-sheet-preset"
                  aria-pressed={durationSeconds === preset}
                  onClick={() => handlePresetSelect(preset)}
                >
                  {formatBreakDuration(preset)}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="break-sheet-section">
            <ExerciseValueStepper
              field="rest"
              layout="side"
              label={labels.breakLabel}
              value={durationSeconds}
              display={display}
              entry={entry ? { field: 'rest', text: entry.text, invalid: entry.invalid } : null}
              timePreview={timePreview}
              errorId={errorId}
              stepLabels={{ decrease: labels.breakStepDecrease, increase: labels.breakStepIncrease }}
              entryHint={stepperLabels.entryHint}
              onStep={handleStep}
              onEntryStart={() => setEntry({ text: display, invalid: false, error: null })}
              onEntryChange={(text) => setEntry({ text, invalid: false, error: null })}
              onEntryCommit={handleEntryCommit}
              onEntryCancel={() => setEntry(null)}
              onEntryBlur={handleEntryBlur}
            />
            {errorMessage && (
              <p id={errorId} role="alert" className="exercise-config-entry-error">
                {errorMessage}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={instructionId} className="break-sheet-field-label">
              {labels.breakInstruction}{' '}
              <span className="break-sheet-field-optional">{labels.breakInstructionOptional}</span>
            </label>
            <input
              id={instructionId}
              type="text"
              value={instructionInput}
              maxLength={BREAK_INSTRUCTION_MAX_LENGTH}
              placeholder={labels.breakInstructionPlaceholder}
              className="break-sheet-field-input"
              onChange={(event) => setInstructionInput(event.target.value)}
            />
          </div>

          <div className="break-sheet-submit-bar">
            <button
              type="submit"
              data-break-sheet-action="submit"
              className="exercise-config-submit chamfer-top-right"
            >
              {mode === 'edit' ? labels.saveBreak : labels.addBreak}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}

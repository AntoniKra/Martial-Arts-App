import { useEffect, useId, useReducer, useRef, useState } from 'react'

import { FormCloseConfirmation } from '@/components/FormCloseConfirmation'
import { screenHeaderLabels } from '@/components/screenHeaderLabels'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { getDisciplineLabelPl } from '@/domain/discipline/disciplineLabels'
import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { ExerciseType } from '@/domain/exercise/exercise'
import { formatSecondsAsClock } from '@/domain/time/formatDuration'
import type { ExerciseConfiguration } from '@/domain/workout/workout.types'
import { exerciseLabels } from '@/features/exercises/exerciseLabels'
import { FocusSkillPicker } from '@/features/focus-skills/FocusSkillPicker'
import { ExerciseValueStepper, type StepperEntry } from '@/features/workout-builder/components/ExerciseValueStepper'
import { RoundStructureBar } from '@/features/workout-builder/components/RoundStructureBar'
import { exerciseConfigurationLabels as labels } from '@/features/workout-builder/exerciseConfigurationLabels'
import {
  createExerciseConfigurationFormState,
  EXERCISE_ROUND_FORMATS,
  exerciseConfigurationFormReducer,
  readStepperValue,
  selectedRoundFormat,
  showsRestBetweenRounds,
  toExerciseConfiguration,
  type ExerciseConfigurationFormState,
} from '@/features/workout-builder/state/exerciseConfigurationForm'
import { parseStepperEntry, type StepperField } from '@/features/workout-builder/state/exerciseStepper'
import { EXERCISE_INSTRUCTION_MAX_LENGTH } from '@/features/workout-builder/state/workoutBuilder.types'
import { workoutBuilderLabels } from '@/features/workout-builder/workoutBuilderLabels'
import './exerciseConfiguration.css'

interface ExerciseConfigurationViewProps {
  disciplineKey: DisciplineKey
  blockNumber: number
  blockLabel: string
  exerciseName: string
  exerciseType: ExerciseType | null
  initialConfiguration: ExerciseConfiguration
  initialInstruction: string | null
  initialRoundSettings?: {
    roundCount: number
    roundDurationSeconds: number
    restBetweenRoundsSeconds: number
  } | null
  initialFocusSkillId: string | null
  /** Exercises with a focus skill elsewhere in the plan, without this one. */
  otherFocusExerciseCount: number
  /** Library or personal exercise ID, linked to a focus skill created here. */
  focusSkillExerciseId: string | null
  variant: 'new' | 'existing'
  submitPending?: boolean
  submitError?: string | null
  onBack: () => void
  onSubmit: (configuration: ExerciseConfiguration, instruction: string | null, focusSkillId: string | null) => void
}

const disciplineTextColors: Record<DisciplineKey, string> = {
  boxing: 'text-discipline-boxing',
  kickboxing: 'text-discipline-kickboxing',
  muay_thai: 'text-discipline-muay-thai',
  k1: 'text-discipline-k1',
  mma_striking: 'text-discipline-mma-striking',
}

const STEPPER_LABELS: Record<StepperField, string> = {
  roundCount: labels.roundCount,
  roundDuration: labels.roundDuration,
  rest: labels.rest,
  continuousDuration: labels.continuousDuration,
}

function normalizeInstruction(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function displayValue(field: StepperField, value: number): string {
  return field === 'roundCount' ? String(value) : formatSecondsAsClock(value)
}

function isSameForm(a: ExerciseConfigurationFormState, b: ExerciseConfigurationFormState): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function ExerciseConfigurationView({
  disciplineKey,
  blockNumber,
  blockLabel,
  exerciseName,
  exerciseType,
  initialConfiguration,
  initialInstruction,
  initialRoundSettings = null,
  initialFocusSkillId,
  otherFocusExerciseCount,
  focusSkillExerciseId,
  variant,
  submitPending = false,
  submitError = null,
  onBack,
  onSubmit,
}: ExerciseConfigurationViewProps) {
  const headingId = useId()
  const notesId = useId()
  const entryErrorId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)

  const [form, dispatch] = useReducer(
    exerciseConfigurationFormReducer,
    { configuration: initialConfiguration, instruction: initialInstruction, roundSettings: initialRoundSettings },
    ({ configuration, instruction, roundSettings }) =>
      createExerciseConfigurationFormState(configuration, instruction, roundSettings),
  )
  const [initialForm] = useState(form)
  const [focusSkillId, setFocusSkillId] = useState(initialFocusSkillId)
  const [entry, setEntry] = useState<StepperEntry | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const entryResult = entry && parseStepperEntry(entry.field, entry.text)

  useEffect(() => {
    if (variant !== 'existing') return
    const frame = requestAnimationFrame(() => headingRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [variant])

  function close() {
    if (!isSameForm(form, initialForm) || focusSkillId !== initialFocusSkillId) setConfirmClose(true)
    else onBack()
  }

  /** Applies a typed value. Returns the form with it, or null while the text is invalid. */
  function commitEntry(): ExerciseConfigurationFormState | null {
    if (!entry || !entryResult) return form
    if (!entryResult.ok) {
      setEntry({ ...entry, invalid: true })
      return null
    }
    const action = { type: 'setValue', field: entry.field, value: entryResult.value } as const
    dispatch(action)
    setEntry(null)
    return exerciseConfigurationFormReducer(form, action)
  }

  // No <form> element: the focus skill picker below contains its own form, and forms must not nest.
  function submit() {
    if (submitPending) return
    const committed = commitEntry()
    if (!committed) return
    onSubmit(toExerciseConfiguration(committed), normalizeInstruction(committed.instructionInput), focusSkillId)
  }

  function renderStepper(field: StepperField, wide = false) {
    const value = readStepperValue(form, field)
    return (
      <ExerciseValueStepper
        key={field}
        field={field}
        label={STEPPER_LABELS[field]}
        value={value}
        display={displayValue(field, value)}
        entry={entry}
        timePreview={field !== 'roundCount' && entry?.field === field && entryResult?.ok
          ? formatSecondsAsClock(entryResult.value)
          : null}
        errorId={entryErrorId}
        wide={wide}
        onStep={(direction) => dispatch({ type: 'step', field, direction })}
        onEntryStart={() => setEntry({ field, text: displayValue(field, value), invalid: false })}
        onEntryChange={(text) => setEntry({ field, text, invalid: false })}
        onEntryCommit={() => { commitEntry() }}
        onEntryCancel={() => setEntry(null)}
      />
    )
  }

  const selectedFormat = selectedRoundFormat(form)
  const showsRest = showsRestBetweenRounds(form)
  const entryError = entry?.invalid && entryResult && !entryResult.ok ? labels.entryErrors[entryResult.error] : null

  return (
    <div className="exercise-config flex flex-1 flex-col overflow-hidden">
      <div className="mx-auto w-full max-w-lg px-4 pt-3 md:max-w-2xl">
        <header className="exercise-config-topbar">
          <button type="button" className="exercise-config-close" aria-label={screenHeaderLabels.close} onClick={close} disabled={submitPending}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <h1 ref={headingRef} id={headingId} tabIndex={-1} className="exercise-config-title">{labels.title}</h1>
          <button type="button" className="exercise-config-header-action" disabled={submitPending} onClick={submit}>
            <span className="exercise-config-header-face">{labels.done}</span>
          </button>
        </header>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-7 pt-3 md:max-w-2xl">
            <section aria-label={labels.context} className="exercise-config-card">
              <p className={`exercise-config-tag ${disciplineTextColors[disciplineKey]}`}>
                {labels.contextTag(getDisciplineLabelPl(disciplineKey), blockNumber, blockLabel)}
              </p>
              <h2 className="exercise-config-name">{exerciseName}</h2>
              {exerciseType && <p className="exercise-config-type">{exerciseLabels.types[exerciseType]}</p>}
              {variant === 'existing' && <p className="exercise-config-type">{labels.existingHint}</p>}
            </section>

            <div className="exercise-config-section">
              <p className="exercise-config-section-title" aria-hidden="true">{labels.mode}</p>
              <SegmentedControl
                ariaLabel={labels.mode}
                options={[
                  { label: labels.rounds, value: 'rounds' },
                  { label: labels.continuous, value: 'continuous' },
                ]}
                value={form.mode}
                onChange={(mode) => { setEntry(null); dispatch({ type: 'setMode', mode }) }}
              />
            </div>

            {form.mode === 'rounds' ? (
              <>
                <fieldset className="exercise-config-section">
                  <legend className="exercise-config-section-title mb-2.5 p-0">{labels.formats}</legend>
                  <div className="exercise-config-formats">
                    {EXERCISE_ROUND_FORMATS.map((format) => {
                      const roundDuration = formatSecondsAsClock(format.roundDurationSeconds)
                      const rest = formatSecondsAsClock(format.restBetweenRoundsSeconds)
                      return (
                        <label key={format.id} className="exercise-config-format">
                          <input
                            type="radio"
                            name={`${headingId}-format`}
                            className="control-input"
                            aria-label={labels.formatName(format.roundCount, roundDuration, rest)}
                            checked={selectedFormat?.id === format.id}
                            onChange={() => { setEntry(null); dispatch({ type: 'applyRoundFormat', formatId: format.id }) }}
                          />
                          <span aria-hidden="true" className="exercise-config-format-rounds">{labels.formatRounds(format.roundCount, roundDuration)}</span>
                          <span aria-hidden="true" className="exercise-config-format-rest">{labels.formatRest(rest)}</span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>

                <section aria-label={labels.roundSettings} className="exercise-config-section">
                  <p className="exercise-config-section-title" aria-hidden="true">{labels.roundSettings}</p>
                  <div className="exercise-config-steppers" data-columns={showsRest ? 3 : 2}>
                    {renderStepper('roundCount')}
                    {renderStepper('roundDuration')}
                    {showsRest && renderStepper('rest')}
                  </div>
                  {entryError && (
                    <p id={entryErrorId} role="alert" className="exercise-config-entry-error">{entryError}</p>
                  )}
                  {!showsRest && <p className="exercise-config-notice">{workoutBuilderLabels.singleRoundRest}</p>}
                  <RoundStructureBar roundCount={form.roundCount} roundDurationSeconds={form.roundDurationSeconds} restSeconds={form.restSeconds} />
                </section>
              </>
            ) : (
              <section aria-label={labels.continuousSection} className="exercise-config-section">
                <p className="exercise-config-section-title" aria-hidden="true">{labels.continuousSection}</p>
                <div className="exercise-config-steppers" data-columns={1}>
                  {renderStepper('continuousDuration', true)}
                </div>
                {entryError && (
                  <p id={entryErrorId} role="alert" className="exercise-config-entry-error">{entryError}</p>
                )}
              </section>
            )}

            <FocusSkillPicker
              variant="module"
              focusSkillId={focusSkillId}
              focusExerciseCount={otherFocusExerciseCount}
              exerciseId={focusSkillExerciseId}
              onChange={setFocusSkillId}
            />

            <div className="exercise-config-section">
              <label htmlFor={notesId} className="exercise-config-section-title">{labels.notes}</label>
              <textarea
                id={notesId}
                value={form.instructionInput}
                maxLength={EXERCISE_INSTRUCTION_MAX_LENGTH}
                rows={2}
                placeholder={labels.notesPlaceholder}
                className="exercise-config-notes"
                onChange={(event) => dispatch({ type: 'setInstruction', value: event.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="exercise-config-submit-bar">
          <div className="mx-auto w-full max-w-lg md:max-w-2xl">
            {submitError && <p role="alert" className="mb-3 text-sm text-crimson-ink">{submitError}</p>}
            <button type="button" className="exercise-config-submit chamfer-top-right" disabled={submitPending} aria-busy={submitPending || undefined} onClick={submit}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{variant === 'existing' ? workoutBuilderLabels.saveChanges : labels.submit}</span>
            </button>
          </div>
        </div>
      </div>
      {confirmClose && <FormCloseConfirmation onCancel={() => setConfirmClose(false)} onDiscard={onBack} />}
    </div>
  )
}

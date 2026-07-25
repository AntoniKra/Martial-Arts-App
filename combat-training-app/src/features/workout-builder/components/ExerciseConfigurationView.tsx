import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'

import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon'
import { Button } from '@/components/ui/Button'
import { RedAccent } from '@/components/ui/RedAccent'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { ExerciseConfiguration, ExerciseMode } from '@/domain/workout/workout.types'
import {
  EXERCISE_INSTRUCTION_MAX_LENGTH,
  ROUND_COUNT_MAX,
} from '@/features/workout-builder/state/workoutBuilder.types'
import {
  computeDurationSeconds,
  parseRequiredNonNegativeInteger,
} from '@/features/workout-builder/utils/durationInput'
import { formatSecondsAsClock } from '@/features/workout-builder/utils/formatDuration'

interface ExerciseConfigurationViewProps {
  blockLabel: string
  exerciseName: string
  initialConfiguration: ExerciseConfiguration
  initialInstruction: string | null
  variant: 'new' | 'existing'
  onBack: () => void
  onSubmit: (configuration: ExerciseConfiguration, instruction: string | null) => void
}

type DurationPresetValue = number | 'custom'

const ROUND_DURATION_PRESETS = [60, 90, 120, 180] as const
const REST_PRESETS = [30, 60, 90, 120] as const

const contentContainerClass = 'mx-auto w-full max-w-lg px-4 md:max-w-2xl'

const fieldClassName =
  'min-h-touch w-full border border-bd bg-elevated px-3 py-2 font-display text-[13px] text-ink placeholder:text-faint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]'

const labelClassName =
  'mb-1.5 block font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint'

const presetLabelClassName =
  'flex min-h-touch cursor-pointer items-center justify-center border px-3 py-2 font-display text-[12px] font-semibold transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--app-focus-ring)]'

function resolvePreset(seconds: number, presets: readonly number[]): DurationPresetValue {
  return presets.includes(seconds) ? seconds : 'custom'
}

function splitSeconds(totalSeconds: number): { minutes: number; seconds: number } {
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
  }
}

function secondsToCustomFields(totalSeconds: number): { minutes: string; seconds: string } {
  const split = splitSeconds(totalSeconds)
  return { minutes: String(split.minutes), seconds: String(split.seconds) }
}

function normalizeInstruction(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function focusField(element: HTMLElement | null | undefined) {
  if (!element) {
    return
  }

  requestAnimationFrame(() => {
    element.focus()
  })
}

interface PresetRadioGroupProps {
  legend: string
  name: string
  presets: readonly { label: string; value: number }[]
  selectedPreset: DurationPresetValue
  onSelectPreset: (value: DurationPresetValue) => void
  customFields?: ReactNode
}

function PresetRadioGroup({
  legend,
  name,
  presets,
  selectedPreset,
  onSelectPreset,
  customFields,
}: PresetRadioGroupProps) {
  return (
    <fieldset className="space-y-3">
      <legend className={labelClassName}>{legend}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {presets.map((preset) => {
          const inputId = `${name}-${preset.value}`

          return (
            <label
              key={preset.value}
              htmlFor={inputId}
              className={[
                presetLabelClassName,
                selectedPreset === preset.value
                  ? 'border-crimson bg-crimson/10 text-ink ring-1 ring-crimson/40'
                  : 'border-bd bg-elevated text-muted hover:border-muted/50 hover:text-ink',
              ].join(' ')}
            >
              <input
                id={inputId}
                type="radio"
                name={name}
                checked={selectedPreset === preset.value}
                onChange={() => onSelectPreset(preset.value)}
                className="sr-only"
              />
              {preset.label}
            </label>
          )
        })}
        <label
          htmlFor={`${name}-custom`}
          className={[
            presetLabelClassName,
            selectedPreset === 'custom'
              ? 'border-crimson bg-crimson/10 text-ink ring-1 ring-crimson/40'
              : 'border-bd bg-elevated text-muted hover:border-muted/50 hover:text-ink',
          ].join(' ')}
        >
          <input
            id={`${name}-custom`}
            type="radio"
            name={name}
            checked={selectedPreset === 'custom'}
            onChange={() => onSelectPreset('custom')}
            className="sr-only"
          />
          Własny
        </label>
      </div>
      {selectedPreset === 'custom' ? customFields : null}
    </fieldset>
  )
}

function CustomDurationFields({
  minutesId,
  secondsId,
  errorId,
  minutes,
  seconds,
  onMinutesChange,
  onSecondsChange,
  errorMessage,
  minutesRef,
  allowZeroTotal = false,
}: {
  minutesId: string
  secondsId: string
  errorId: string
  minutes: string
  seconds: string
  onMinutesChange: (value: string) => void
  onSecondsChange: (value: string) => void
  errorMessage: string | null
  minutesRef?: React.RefObject<HTMLInputElement | null>
  allowZeroTotal?: boolean
}) {
  return (
    <div className="space-y-3 border border-bd bg-surface p-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={minutesId} className={labelClassName}>
            Minuty
          </label>
          <input
            ref={minutesRef}
            id={minutesId}
            inputMode="numeric"
            value={minutes}
            onChange={(event) => onMinutesChange(event.target.value)}
            className={fieldClassName}
            aria-invalid={errorMessage ? true : undefined}
            aria-describedby={errorMessage ? errorId : undefined}
          />
        </div>
        <div>
          <label htmlFor={secondsId} className={labelClassName}>
            Sekundy
          </label>
          <input
            id={secondsId}
            inputMode="numeric"
            value={seconds}
            onChange={(event) => onSecondsChange(event.target.value)}
            className={fieldClassName}
            aria-invalid={errorMessage ? true : undefined}
            aria-describedby={errorMessage ? errorId : undefined}
          />
        </div>
      </div>
      {errorMessage ? (
        <p id={errorId} className="text-[13px] leading-relaxed text-crimson">
          {errorMessage}
        </p>
      ) : null}
      {allowZeroTotal ? (
        <p className="text-[12px] text-muted">Przerwa może wynosić 0:00.</p>
      ) : null}
    </div>
  )
}

function createInitialMode(configuration: ExerciseConfiguration): Exclude<ExerciseMode, 'strength'> {
  return configuration.mode === 'continuous' ? 'continuous' : 'rounds'
}

function createFormStateFromConfiguration(
  configuration: ExerciseConfiguration,
  instruction: string | null,
) {
  const roundsConfiguration =
    configuration.mode === 'rounds'
      ? configuration
      : { roundCount: 3, roundDurationSeconds: 180, restBetweenRoundsSeconds: 60 }
  const continuousSeconds =
    configuration.mode === 'continuous' ? configuration.durationSeconds : 300

  return {
    mode: createInitialMode(configuration),
    roundCountInput: String(roundsConfiguration.roundCount),
    roundDurationPreset: resolvePreset(roundsConfiguration.roundDurationSeconds, ROUND_DURATION_PRESETS),
    roundDurationCustom: secondsToCustomFields(roundsConfiguration.roundDurationSeconds),
    restPreset: resolvePreset(roundsConfiguration.restBetweenRoundsSeconds, REST_PRESETS),
    restCustom: secondsToCustomFields(roundsConfiguration.restBetweenRoundsSeconds),
    continuousMinutesInput: String(Math.floor(continuousSeconds / 60)),
    continuousSecondsInput: String(continuousSeconds % 60),
    instructionInput: instruction ?? '',
  }
}

export function ExerciseConfigurationView({
  blockLabel,
  exerciseName,
  initialConfiguration,
  initialInstruction,
  variant,
  onBack,
  onSubmit,
}: ExerciseConfigurationViewProps) {
  const instructionId = useId()
  const roundCountId = useId()
  const roundCountErrorId = useId()
  const continuousErrorId = useId()
  const roundDurationCustomMinutesId = useId()
  const roundDurationCustomSecondsId = useId()
  const roundDurationCustomErrorId = useId()
  const restCustomMinutesId = useId()
  const restCustomSecondsId = useId()
  const restCustomErrorId = useId()
  const continuousMinutesId = useId()
  const continuousSecondsId = useId()

  const roundCountRef = useRef<HTMLInputElement>(null)
  const roundDurationCustomMinutesRef = useRef<HTMLInputElement>(null)
  const restCustomMinutesRef = useRef<HTMLInputElement>(null)
  const continuousMinutesRef = useRef<HTMLInputElement>(null)

  const initialFormState = createFormStateFromConfiguration(initialConfiguration, initialInstruction)

  const [mode, setMode] = useState<Exclude<ExerciseMode, 'strength'>>(initialFormState.mode)
  const [roundCountInput, setRoundCountInput] = useState(initialFormState.roundCountInput)
  const [roundDurationPreset, setRoundDurationPreset] = useState<DurationPresetValue>(
    initialFormState.roundDurationPreset,
  )
  const [roundDurationCustom, setRoundDurationCustom] = useState(initialFormState.roundDurationCustom)
  const [restPreset, setRestPreset] = useState<DurationPresetValue>(initialFormState.restPreset)
  const [restCustom, setRestCustom] = useState(initialFormState.restCustom)
  const [continuousMinutesInput, setContinuousMinutesInput] = useState(initialFormState.continuousMinutesInput)
  const [continuousSecondsInput, setContinuousSecondsInput] = useState(initialFormState.continuousSecondsInput)
  const [instructionInput, setInstructionInput] = useState(initialFormState.instructionInput)
  const [roundCountError, setRoundCountError] = useState<string | null>(null)
  const [roundDurationCustomError, setRoundDurationCustomError] = useState<string | null>(null)
  const [restCustomError, setRestCustomError] = useState<string | null>(null)
  const [continuousError, setContinuousError] = useState<string | null>(null)

  const backLabel = variant === 'new' ? 'Wróć do biblioteki' : 'Wróć do osi treningu'
  const heading = variant === 'new' ? 'Konfiguracja ćwiczenia' : 'Edycja ćwiczenia'
  const submitLabel = variant === 'new' ? 'Dodaj ćwiczenie' : 'Zapisz zmiany'

  useEffect(() => {
    if (variant !== 'existing') {
      return
    }

    requestAnimationFrame(() => {
      if (initialConfiguration.mode === 'continuous') {
        continuousMinutesRef.current?.focus()
        return
      }

      roundCountRef.current?.focus()
    })
  }, [variant, initialConfiguration.mode])

  function handleSelectRoundDurationPreset(value: DurationPresetValue) {
    setRoundDurationPreset(value)

    if (value !== 'custom') {
      setRoundDurationCustom(secondsToCustomFields(value))
    }
  }

  function handleSelectRestPreset(value: DurationPresetValue) {
    setRestPreset(value)

    if (value !== 'custom') {
      setRestCustom(secondsToCustomFields(value))
    }
  }

  function resolveRoundDurationSeconds(): { seconds: number | null; error: string | null } {
    if (roundDurationPreset !== 'custom') {
      return { seconds: roundDurationPreset, error: null }
    }

    return computeDurationSeconds(roundDurationCustom.minutes, roundDurationCustom.seconds, false)
  }

  function resolveRestSeconds(): { seconds: number | null; error: string | null } {
    if (restPreset !== 'custom') {
      return { seconds: restPreset, error: null }
    }

    return computeDurationSeconds(restCustom.minutes, restCustom.seconds, true)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRoundCountError(null)
    setRoundDurationCustomError(null)
    setRestCustomError(null)
    setContinuousError(null)

    if (mode === 'continuous') {
      const result = computeDurationSeconds(continuousMinutesInput, continuousSecondsInput, false)

      if (result.error) {
        setContinuousError(result.error)
        focusField(continuousMinutesRef.current)
        return
      }

      onSubmit({ mode: 'continuous', durationSeconds: result.seconds ?? 0 }, normalizeInstruction(instructionInput))
      return
    }

    const roundCount = parseRequiredNonNegativeInteger(roundCountInput)

    if (roundCount === null || roundCount < 1 || roundCount > ROUND_COUNT_MAX) {
      setRoundCountError(`Liczba rund musi być liczbą całkowitą od 1 do ${ROUND_COUNT_MAX}.`)
      focusField(roundCountRef.current)
      return
    }

    const roundDuration = resolveRoundDurationSeconds()

    if (roundDuration.error) {
      setRoundDurationCustomError(roundDuration.error)
      focusField(roundDurationCustomMinutesRef.current)
      return
    }

    const restDuration = resolveRestSeconds()

    if (restDuration.error) {
      setRestCustomError(restDuration.error)
      focusField(restCustomMinutesRef.current)
      return
    }

    onSubmit(
      {
        mode: 'rounds',
        roundCount,
        roundDurationSeconds: roundDuration.seconds ?? 0,
        restBetweenRoundsSeconds: restDuration.seconds ?? 0,
      },
      normalizeInstruction(instructionInput),
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-bd bg-surface">
        <div className={`${contentContainerClass} py-4`}>
          <button
            type="button"
            onClick={onBack}
            className="mb-4 inline-flex min-h-touch items-center gap-1 font-display text-[12px] font-semibold tracking-[0.04em] text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
          >
            <ChevronRightIcon className="rotate-180" />
            {backLabel}
          </button>

          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
            Blok · {blockLabel}
          </p>
          <h1 className="mt-3 font-display text-[24px] font-bold text-ink md:text-[28px]">{heading}</h1>
          <p className="mt-2 font-display text-[16px] font-semibold leading-snug text-ink">{exerciseName}</p>
          {variant === 'existing' ? (
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Aby zmienić samo ćwiczenie, usuń ten element i dodaj nowe.
            </p>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-24">
          <div className={`${contentContainerClass} space-y-6 py-5`}>
            <SegmentedControl
              label="Tryb"
              options={[
                { label: 'Rundy', value: 'rounds' },
                { label: 'Ciągłe', value: 'continuous' },
              ]}
              value={mode}
              onChange={setMode}
            />

            <RedAccent />

            {mode === 'rounds' ? (
              <>
                <div>
                  <label htmlFor={roundCountId} className={labelClassName}>
                    Liczba rund
                  </label>
                  <input
                    ref={roundCountRef}
                    id={roundCountId}
                    inputMode="numeric"
                    value={roundCountInput}
                    onChange={(event) => setRoundCountInput(event.target.value)}
                    className={fieldClassName}
                    aria-invalid={roundCountError ? true : undefined}
                    aria-describedby={roundCountError ? roundCountErrorId : undefined}
                  />
                  {roundCountError ? (
                    <p id={roundCountErrorId} className="mt-2 text-[13px] leading-relaxed text-crimson">
                      {roundCountError}
                    </p>
                  ) : null}
                </div>

                <PresetRadioGroup
                  legend="Czas rundy"
                  name="round-duration"
                  presets={ROUND_DURATION_PRESETS.map((value) => ({
                    label: formatSecondsAsClock(value),
                    value,
                  }))}
                  selectedPreset={roundDurationPreset}
                  onSelectPreset={handleSelectRoundDurationPreset}
                  customFields={
                    <CustomDurationFields
                      minutesId={roundDurationCustomMinutesId}
                      secondsId={roundDurationCustomSecondsId}
                      errorId={roundDurationCustomErrorId}
                      minutes={roundDurationCustom.minutes}
                      seconds={roundDurationCustom.seconds}
                      minutesRef={roundDurationCustomMinutesRef}
                      onMinutesChange={(value) =>
                        setRoundDurationCustom((current) => ({ ...current, minutes: value }))
                      }
                      onSecondsChange={(value) =>
                        setRoundDurationCustom((current) => ({ ...current, seconds: value }))
                      }
                      errorMessage={roundDurationCustomError}
                    />
                  }
                />

                <PresetRadioGroup
                  legend="Przerwa między rundami"
                  name="round-rest"
                  presets={REST_PRESETS.map((value) => ({
                    label: formatSecondsAsClock(value),
                    value,
                  }))}
                  selectedPreset={restPreset}
                  onSelectPreset={handleSelectRestPreset}
                  customFields={
                    <CustomDurationFields
                      minutesId={restCustomMinutesId}
                      secondsId={restCustomSecondsId}
                      errorId={restCustomErrorId}
                      minutes={restCustom.minutes}
                      seconds={restCustom.seconds}
                      minutesRef={restCustomMinutesRef}
                      onMinutesChange={(value) => setRestCustom((current) => ({ ...current, minutes: value }))}
                      onSecondsChange={(value) => setRestCustom((current) => ({ ...current, seconds: value }))}
                      errorMessage={restCustomError}
                      allowZeroTotal
                    />
                  }
                />
              </>
            ) : (
              <div>
                <p className={labelClassName}>Czas trwania</p>
                <CustomDurationFields
                  minutesId={continuousMinutesId}
                  secondsId={continuousSecondsId}
                  errorId={continuousErrorId}
                  minutes={continuousMinutesInput}
                  seconds={continuousSecondsInput}
                  minutesRef={continuousMinutesRef}
                  onMinutesChange={setContinuousMinutesInput}
                  onSecondsChange={setContinuousSecondsInput}
                  errorMessage={continuousError}
                />
              </div>
            )}

            <div>
              <label htmlFor={instructionId} className={labelClassName}>
                Instrukcja <span className="font-normal normal-case tracking-normal text-faint">(opcjonalnie)</span>
              </label>
              <textarea
                id={instructionId}
                value={instructionInput}
                maxLength={EXERCISE_INSTRUCTION_MAX_LENGTH}
                rows={3}
                placeholder="Notatki wykonawcze dla tego ćwiczenia…"
                className={`${fieldClassName} resize-y`}
                onChange={(event) => setInstructionInput(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-bd bg-surface">
          <div className={`${contentContainerClass} py-4`}>
            <Button type="submit" variant="secondary" className="w-full">
              {submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

import {
  useEffect,
  useId,
  useReducer,
  useRef,
  type FormEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'

import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon'
import { Button } from '@/components/ui/Button'
import { RedAccent } from '@/components/ui/RedAccent'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { ExerciseConfiguration } from '@/domain/workout/workout.types'
import {
  createExerciseConfigurationFormState,
  emptyExerciseConfigurationFieldErrors,
  exerciseConfigurationFormReducer,
  REST_PRESETS,
  ROUND_COUNT_PRESETS,
  ROUND_DURATION_PRESETS,
  ROUND_FORMAT_PRESETS,
  selectedRoundFormat,
} from '@/features/workout-builder/state/exerciseConfigurationForm'
import {
  EXERCISE_INSTRUCTION_MAX_LENGTH,
  ROUND_COUNT_MAX,
} from '@/features/workout-builder/state/workoutBuilder.types'
import {
  computeDurationSeconds,
  parseRequiredNonNegativeInteger,
} from '@/features/workout-builder/utils/durationInput'
import { formatSecondsAsClock } from '@/domain/time/formatDuration'

interface ExerciseConfigurationViewProps {
  blockLabel: string
  exerciseName: string
  initialConfiguration: ExerciseConfiguration
  initialInstruction: string | null
  initialRoundSettings?: {
    roundCount: number
    roundDurationSeconds: number
    restBetweenRoundsSeconds: number
  } | null
  variant: 'new' | 'existing'
  onBack: () => void
  onSubmit: (configuration: ExerciseConfiguration, instruction: string | null) => void
}

type DurationPresetValue = number | 'custom'

const contentContainerClass = 'mx-auto w-full max-w-lg px-4 md:max-w-2xl'

const fieldClassName =
  'min-h-touch w-full border border-bd bg-input px-3 py-2 font-display text-[16px] text-ink placeholder:text-faint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]'

const labelClassName =
  'mb-1.5 block font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint'

const presetLabelClassName =
  'flex min-h-touch cursor-pointer items-center justify-center border px-3 py-2 font-display text-[12px] font-semibold transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--app-focus-ring)]'

const formatButtonClassName =
  'flex min-h-touch w-full items-center justify-center border px-3 py-2 text-center font-display text-[12px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]'

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

function isListedRoundCount(roundCount: number): boolean {
  return (ROUND_COUNT_PRESETS as readonly number[]).includes(roundCount)
}

interface PresetRadioGroupProps {
  legend: string
  name: string
  presets: readonly { label: string; value: number }[]
  selectedPreset: DurationPresetValue
  onSelectPreset: (value: DurationPresetValue) => void
  customLabel?: string
  customFields?: ReactNode
  fieldsetRef?: Ref<HTMLFieldSetElement>
}

function PresetRadioGroup({
  legend,
  name,
  presets,
  selectedPreset,
  onSelectPreset,
  customLabel = 'Własny',
  customFields,
  fieldsetRef,
}: PresetRadioGroupProps) {
  return (
    <fieldset ref={fieldsetRef} className="space-y-3">
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
          {customLabel}
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
  minutesRef?: RefObject<HTMLInputElement | null>
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
        <p id={errorId} className="text-[13px] leading-relaxed text-crimson-ink">
          {errorMessage}
        </p>
      ) : null}
      {allowZeroTotal ? (
        <p className="text-[12px] text-muted">Przerwa może wynosić 0:00.</p>
      ) : null}
    </div>
  )
}

export function ExerciseConfigurationView({
  blockLabel,
  exerciseName,
  initialConfiguration,
  initialInstruction,
  initialRoundSettings = null,
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

  const roundCountGroupRef = useRef<HTMLFieldSetElement>(null)
  const roundCountRef = useRef<HTMLInputElement>(null)
  const roundDurationCustomMinutesRef = useRef<HTMLInputElement>(null)
  const restCustomMinutesRef = useRef<HTMLInputElement>(null)
  const continuousMinutesRef = useRef<HTMLInputElement>(null)

  const [form, dispatch] = useReducer(
    exerciseConfigurationFormReducer,
    {
      configuration: initialConfiguration,
      instruction: initialInstruction,
      roundSettings: initialRoundSettings,
    },
    ({ configuration, instruction, roundSettings }) =>
      createExerciseConfigurationFormState(configuration, instruction, roundSettings),
  )
  const selectedFormat = selectedRoundFormat(form)

  const backLabel = variant === 'new' ? 'Wróć do biblioteki' : 'Wróć do osi treningu'
  const heading = variant === 'new' ? 'Konfiguracja ćwiczenia' : 'Edycja ćwiczenia'
  const submitLabel = variant === 'new' ? 'Dodaj ćwiczenie' : 'Zapisz zmiany'
  const initialMode = initialConfiguration.mode
  const initialRoundCount = initialConfiguration.mode === 'rounds' ? initialConfiguration.roundCount : null

  useEffect(() => {
    if (variant !== 'existing') {
      return
    }

    const frame = requestAnimationFrame(() => {
      if (initialMode === 'continuous') {
        continuousMinutesRef.current?.focus()
        return
      }

      if (initialRoundCount !== null && !isListedRoundCount(initialRoundCount)) {
        roundCountRef.current?.focus()
        return
      }

      roundCountGroupRef.current?.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.focus()
    })

    return () => cancelAnimationFrame(frame)
  }, [variant, initialMode, initialRoundCount])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const clearedErrors = emptyExerciseConfigurationFieldErrors()

    if (form.mode === 'continuous') {
      const result = computeDurationSeconds(form.continuousMinutesInput, form.continuousSecondsInput, false)

      if (result.error) {
        dispatch({
          type: 'replaceFieldErrors',
          errors: { ...clearedErrors, continuousDuration: result.error },
        })
        focusField(continuousMinutesRef.current)
        return
      }

      onSubmit(
        { mode: 'continuous', durationSeconds: result.seconds ?? 0 },
        normalizeInstruction(form.instructionInput),
      )
      return
    }

    const roundCount =
      form.roundCountPreset === 'custom'
        ? parseRequiredNonNegativeInteger(form.roundCountInput)
        : form.roundCountPreset

    if (roundCount === null || roundCount < 1 || roundCount > ROUND_COUNT_MAX) {
      dispatch({
        type: 'replaceFieldErrors',
        errors: {
          ...clearedErrors,
          roundCount: `Liczba rund musi być liczbą całkowitą od 1 do ${ROUND_COUNT_MAX}.`,
        },
      })
      focusField(roundCountRef.current)
      return
    }

    const roundDuration =
      form.roundDurationPreset === 'custom'
        ? computeDurationSeconds(form.roundDurationCustom.minutes, form.roundDurationCustom.seconds, false)
        : { seconds: form.roundDurationPreset, error: null }

    if (roundDuration.error) {
      dispatch({
        type: 'replaceFieldErrors',
        errors: { ...clearedErrors, roundDuration: roundDuration.error },
      })
      focusField(roundDurationCustomMinutesRef.current)
      return
    }

    const restDuration =
      form.restPreset === 'custom'
        ? computeDurationSeconds(form.restCustom.minutes, form.restCustom.seconds, true)
        : { seconds: form.restPreset, error: null }

    if (restDuration.error) {
      dispatch({
        type: 'replaceFieldErrors',
        errors: { ...clearedErrors, rest: restDuration.error },
      })
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
      normalizeInstruction(form.instructionInput),
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
              value={form.mode}
              onChange={(mode) => dispatch({ type: 'setMode', mode })}
            />

            <RedAccent />

            {form.mode === 'rounds' ? (
              <>
                <fieldset className="space-y-3">
                  <legend className={labelClassName}>Gotowe formaty</legend>
                  <div className="grid gap-2">
                    {ROUND_FORMAT_PRESETS.map((format) => {
                      const selected = selectedFormat?.id === format.id

                      return (
                        <button
                          key={format.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => dispatch({ type: 'applyRoundFormat', formatId: format.id })}
                          className={[
                            formatButtonClassName,
                            selected
                              ? 'border-crimson bg-crimson/10 text-ink ring-1 ring-crimson/40'
                              : 'border-bd bg-elevated text-muted hover:border-muted/50 hover:text-ink',
                          ].join(' ')}
                        >
                          {format.label}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>

                <PresetRadioGroup
                  legend="Liczba rund"
                  name="round-count"
                  customLabel="Własna"
                  fieldsetRef={roundCountGroupRef}
                  presets={ROUND_COUNT_PRESETS.map((value) => ({
                    label: String(value),
                    value,
                  }))}
                  selectedPreset={form.roundCountPreset}
                  onSelectPreset={(value) => dispatch({ type: 'selectRoundCountPreset', value })}
                  customFields={
                    <div className="space-y-3 border border-bd bg-surface p-3">
                      <div>
                        <label htmlFor={roundCountId} className={labelClassName}>
                          Własna liczba rund
                        </label>
                        <input
                          ref={roundCountRef}
                          id={roundCountId}
                          inputMode="numeric"
                          value={form.roundCountInput}
                          onChange={(event) =>
                            dispatch({ type: 'setRoundCountInput', value: event.target.value })
                          }
                          className={fieldClassName}
                          aria-invalid={form.errors.roundCount ? true : undefined}
                          aria-describedby={form.errors.roundCount ? roundCountErrorId : undefined}
                        />
                      </div>
                      {form.errors.roundCount ? (
                        <p id={roundCountErrorId} className="text-[13px] leading-relaxed text-crimson-ink">
                          {form.errors.roundCount}
                        </p>
                      ) : null}
                    </div>
                  }
                />

                <PresetRadioGroup
                  legend="Czas rundy"
                  name="round-duration"
                  presets={ROUND_DURATION_PRESETS.map((value) => ({
                    label: formatSecondsAsClock(value),
                    value,
                  }))}
                  selectedPreset={form.roundDurationPreset}
                  onSelectPreset={(value) => dispatch({ type: 'selectRoundDurationPreset', value })}
                  customFields={
                    <CustomDurationFields
                      minutesId={roundDurationCustomMinutesId}
                      secondsId={roundDurationCustomSecondsId}
                      errorId={roundDurationCustomErrorId}
                      minutes={form.roundDurationCustom.minutes}
                      seconds={form.roundDurationCustom.seconds}
                      minutesRef={roundDurationCustomMinutesRef}
                      onMinutesChange={(value) => dispatch({ type: 'setRoundDurationMinutes', value })}
                      onSecondsChange={(value) => dispatch({ type: 'setRoundDurationSeconds', value })}
                      errorMessage={form.errors.roundDuration}
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
                  selectedPreset={form.restPreset}
                  onSelectPreset={(value) => dispatch({ type: 'selectRestPreset', value })}
                  customFields={
                    <CustomDurationFields
                      minutesId={restCustomMinutesId}
                      secondsId={restCustomSecondsId}
                      errorId={restCustomErrorId}
                      minutes={form.restCustom.minutes}
                      seconds={form.restCustom.seconds}
                      minutesRef={restCustomMinutesRef}
                      onMinutesChange={(value) => dispatch({ type: 'setRestMinutes', value })}
                      onSecondsChange={(value) => dispatch({ type: 'setRestSeconds', value })}
                      errorMessage={form.errors.rest}
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
                  minutes={form.continuousMinutesInput}
                  seconds={form.continuousSecondsInput}
                  minutesRef={continuousMinutesRef}
                  onMinutesChange={(value) => dispatch({ type: 'setContinuousMinutes', value })}
                  onSecondsChange={(value) => dispatch({ type: 'setContinuousSeconds', value })}
                  errorMessage={form.errors.continuousDuration}
                />
              </div>
            )}

            <div>
              <label htmlFor={instructionId} className={labelClassName}>
                Instrukcja <span className="font-normal normal-case tracking-normal text-faint">(opcjonalnie)</span>
              </label>
              <textarea
                id={instructionId}
                value={form.instructionInput}
                maxLength={EXERCISE_INSTRUCTION_MAX_LENGTH}
                rows={3}
                placeholder="Notatki wykonawcze dla tego ćwiczenia…"
                className={`${fieldClassName} resize-y`}
                onChange={(event) => dispatch({ type: 'setInstruction', value: event.target.value })}
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

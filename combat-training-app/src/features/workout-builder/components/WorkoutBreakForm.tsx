import { useId, useRef, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { BREAK_INSTRUCTION_MAX_LENGTH } from '@/features/workout-builder/state/workoutBuilder.types'
import { computeDurationSeconds } from '@/features/workout-builder/utils/durationInput'

interface WorkoutBreakFormProps {
  mode: 'add' | 'edit'
  initialDurationSeconds?: number
  initialInstruction?: string | null
  onSubmit: (durationSeconds: number, instruction: string | null) => void
  onCancel: () => void
}

const fieldClassName =
  'min-h-touch w-full border border-bd bg-elevated px-3 py-2 font-display text-[13px] text-ink placeholder:text-faint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]'

const labelClassName =
  'mb-1.5 block font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint'

function normalizeInstruction(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function WorkoutBreakForm({
  mode,
  initialDurationSeconds = 60,
  initialInstruction = null,
  onSubmit,
  onCancel,
}: WorkoutBreakFormProps) {
  const baseId = useId()
  const minutesId = `${baseId}-minutes`
  const secondsId = `${baseId}-seconds`
  const instructionId = `${baseId}-instruction`
  const errorId = `${baseId}-error`
  const minutesRef = useRef<HTMLInputElement>(null)

  const [minutesInput, setMinutesInput] = useState(String(Math.floor(initialDurationSeconds / 60)))
  const [secondsInput, setSecondsInput] = useState(String(initialDurationSeconds % 60))
  const [instructionInput, setInstructionInput] = useState(initialInstruction ?? '')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const result = computeDurationSeconds(minutesInput, secondsInput, false)

    if (result.error) {
      setErrorMessage(
        result.seconds === null && result.error === 'Łączny czas musi być większy od 0.'
          ? 'Łączny czas przerwy musi być większy od 0.'
          : result.error,
      )
      requestAnimationFrame(() => {
        minutesRef.current?.focus()
      })
      return
    }

    setErrorMessage(null)
    onSubmit(result.seconds ?? 0, normalizeInstruction(instructionInput))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-bd bg-surface p-4">
      <p className="font-display text-[12px] font-semibold tracking-[0.04em] text-ink">
        {mode === 'add' ? 'Nowa przerwa' : 'Edycja przerwy'}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={minutesId} className={labelClassName}>
            Minuty
          </label>
          <input
            ref={minutesRef}
            id={minutesId}
            inputMode="numeric"
            value={minutesInput}
            onChange={(event) => setMinutesInput(event.target.value)}
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
            value={secondsInput}
            onChange={(event) => setSecondsInput(event.target.value)}
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

      <div>
        <label htmlFor={instructionId} className={labelClassName}>
          Instrukcja <span className="font-normal normal-case tracking-normal text-faint">(opcjonalnie)</span>
        </label>
        <input
          id={instructionId}
          type="text"
          value={instructionInput}
          maxLength={BREAK_INSTRUCTION_MAX_LENGTH}
          placeholder="np. Woda i reset oddechu"
          className={fieldClassName}
          onChange={(event) => setInstructionInput(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" variant="secondary">
          {mode === 'add' ? 'Dodaj przerwę' : 'Zapisz przerwę'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Anuluj
        </Button>
      </div>
    </form>
  )
}

export function formatBreakDuration(durationSeconds: number): string {
  const minutes = Math.floor(durationSeconds / 60)
  const seconds = durationSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

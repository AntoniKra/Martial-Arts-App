import { useId, useRef, type KeyboardEvent } from 'react'

type AccessibleNameProps =
  | { label: string; ariaLabel?: never }
  | { label?: never; ariaLabel: string }

export type RatingScaleProps = AccessibleNameProps & {
  value: number | null
  onChange: (value: number) => void
  min?: number
  max?: number
  description?: string
  valueLabels?: Readonly<Record<number, string>> | readonly string[]
  disabled?: boolean
  className?: string
}

function resolveValueLabel(
  value: number,
  min: number,
  valueLabels: RatingScaleProps['valueLabels'],
): string | undefined {
  if (!valueLabels) return undefined

  if (Array.isArray(valueLabels)) {
    return valueLabels[value - min]
  }

  return valueLabels[value]
}

function buildValues(min: number, max: number): number[] {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new Error('RatingScale requires integer min/max with max >= min.')
  }

  const values: number[] = []
  for (let value = min; value <= max; value += 1) {
    values.push(value)
  }
  return values
}

function isValueInRange(value: number | null, min: number, max: number): value is number {
  return value !== null && Number.isInteger(value) && value >= min && value <= max
}

function formatOptionAriaLabel(optionValue: number, optionLabel?: string): string {
  if (optionLabel) {
    return `${optionValue} — ${optionLabel}`
  }
  return String(optionValue)
}

export function RatingScale({
  value,
  onChange,
  min = 1,
  max = 5,
  label,
  ariaLabel,
  description,
  valueLabels,
  disabled = false,
  className = '',
}: RatingScaleProps) {
  const groupId = useId()
  const labelId = `${groupId}-label`
  const descriptionId = `${groupId}-description`
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  const values = buildValues(min, max)
  const valueInRange = isValueInRange(value, min, max)
  const selectedLabel = valueInRange ? resolveValueLabel(value, min, valueLabels) : undefined

  function focusOptionByIndex(index: number) {
    buttonRefs.current[index]?.focus()
  }

  function selectAndFocus(next: number) {
    if (disabled) return
    onChange(next)

    const index = values.indexOf(next)
    if (index >= 0) {
      focusOptionByIndex(index)
    }
  }

  function getTabIndex(optionValue: number): number {
    if (disabled) return -1

    if (valueInRange) {
      return value === optionValue ? 0 : -1
    }

    return optionValue === min ? 0 : -1
  }

  function isSelected(optionValue: number): boolean {
    return valueInRange && value === optionValue
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled || values.length === 0) return

    const currentIndex = valueInRange ? values.indexOf(value) : -1
    const fallbackIndex = currentIndex >= 0 ? currentIndex : 0

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      const nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, values.length - 1)
      selectAndFocus(values[nextIndex])
      return
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      const nextIndex = currentIndex < 0 ? 0 : Math.max(currentIndex - 1, 0)
      selectAndFocus(values[nextIndex])
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      selectAndFocus(values[0])
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      selectAndFocus(values[values.length - 1])
      return
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      selectAndFocus(values[fallbackIndex])
    }
  }

  return (
    <div className={className}>
      {label ? (
        <p id={labelId} className="mb-2 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
          {label}
        </p>
      ) : null}

      {description ? (
        <p id={descriptionId} className="mb-3 text-sm leading-5 text-muted">
          {description}
        </p>
      ) : null}

      <div
        role="radiogroup"
        aria-labelledby={label ? labelId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        aria-label={label ? undefined : ariaLabel}
        aria-disabled={disabled || undefined}
        onKeyDown={handleKeyDown}
        className="grid grid-cols-[repeat(auto-fill,minmax(var(--app-touch-min),1fr))] gap-1"
      >
        {values.map((optionValue, index) => {
          const selected = isSelected(optionValue)
          const optionLabel = resolveValueLabel(optionValue, min, valueLabels)

          return (
            <button
              key={optionValue}
              ref={(element) => {
                buttonRefs.current[index] = element
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={formatOptionAriaLabel(optionValue, optionLabel)}
              title={optionLabel}
              disabled={disabled}
              tabIndex={getTabIndex(optionValue)}
              onClick={() => selectAndFocus(optionValue)}
              className={[
                'relative min-h-touch min-w-touch border py-3 font-display text-[13px] font-bold tabular-nums transition-colors',
                'cursor-pointer disabled:cursor-not-allowed disabled:opacity-40',
                selected
                  ? 'border-2 border-crimson bg-crimson font-extrabold text-on-accent shadow-[inset_0_0_0_2px_var(--app-on-accent)]'
                  : 'border border-bd text-muted hover:border-muted hover:text-ink active:border-muted',
              ].join(' ')}
            >
              {selected ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1 right-1 text-[9px] leading-none text-on-accent"
                >
                  ✓
                </span>
              ) : null}
              {optionValue}
            </button>
          )
        })}
      </div>

      {selectedLabel ? <p className="mt-2 text-sm text-muted">{selectedLabel}</p> : null}
    </div>
  )
}

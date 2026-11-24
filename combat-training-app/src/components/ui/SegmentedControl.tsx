import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

export interface SegmentedControlOption<T extends string> {
  label: string
  value: T
  disabled?: boolean
  icon?: ReactNode
}

type AccessibleNameProps =
  | { label: string; ariaLabel?: never }
  | { label?: never; ariaLabel: string }

export type SegmentedControlProps<T extends string> = AccessibleNameProps & {
  options: readonly SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
  className?: string
  variant?: 'default' | 'outlined'
}

function assertUniqueOptionValues<T extends string>(options: readonly SegmentedControlOption<T>[]): void {
  const seen = new Set<string>()

  for (const option of options) {
    if (seen.has(option.value)) {
      throw new Error(`SegmentedControl: duplicate option value "${option.value}".`)
    }
    seen.add(option.value)
  }
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  ariaLabel,
  disabled = false,
  className = '',
  variant = 'default',
}: SegmentedControlProps<T>) {
  assertUniqueOptionValues(options)

  const groupId = useId()
  const labelId = `${groupId}-label`
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  const enabledOptions = options.filter((option) => !option.disabled)
  const valueOption = options.find((option) => option.value === value)
  const isValueSelectable = Boolean(valueOption && !valueOption.disabled && !disabled)
  const groupDisabled = disabled || enabledOptions.length === 0

  function focusOptionByValue(optionValue: T) {
    const index = options.findIndex((option) => option.value === optionValue)
    if (index >= 0) {
      buttonRefs.current[index]?.focus()
    }
  }

  function selectAndFocus(next: T) {
    if (disabled) return

    const option = options.find((item) => item.value === next)
    if (!option || option.disabled) return

    onChange(next)
    focusOptionByValue(next)
  }

  function getTabIndex(option: SegmentedControlOption<T>): number {
    if (groupDisabled) return -1

    if (isValueSelectable) {
      return option.value === value ? 0 : -1
    }

    return option.value === enabledOptions[0]?.value ? 0 : -1
  }

  function isSelected(option: SegmentedControlOption<T>): boolean {
    return isValueSelectable && option.value === value
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (groupDisabled) return

    const currentIndex = enabledOptions.findIndex((option) => option.value === value)
    const safeIndex = currentIndex >= 0 ? currentIndex : 0

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      const next = enabledOptions[(safeIndex + 1) % enabledOptions.length]
      selectAndFocus(next.value)
      return
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      const next = enabledOptions[(safeIndex - 1 + enabledOptions.length) % enabledOptions.length]
      selectAndFocus(next.value)
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      selectAndFocus(enabledOptions[0].value)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      selectAndFocus(enabledOptions[enabledOptions.length - 1].value)
    }
  }

  return (
    <div className={className}>
      {label ? (
        <p id={labelId} className="mb-2 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
          {label}
        </p>
      ) : null}
      <div
        role="radiogroup"
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : ariaLabel}
        aria-disabled={groupDisabled || undefined}
        onKeyDown={handleKeyDown}
        className={`flex rounded-sm border border-bd ${variant === 'outlined' ? 'gap-1 bg-surface p-[3px]' : 'overflow-hidden bg-elevated'}`}
      >
        {options.map((option, index) => {
          const selected = isSelected(option)
          const optionDisabled = disabled || Boolean(option.disabled)

          return (
            <button
              key={option.value}
              ref={(element) => {
                buttonRefs.current[index] = element
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={optionDisabled}
              tabIndex={getTabIndex(option)}
              onClick={() => selectAndFocus(option.value)}
              className={[
                'relative min-h-touch flex-1 px-2 py-2.5 font-display font-semibold uppercase tracking-[0.06em] transition-colors',
                variant === 'outlined' ? 'text-[11.5px]' : 'text-[12px]',
                'cursor-pointer disabled:cursor-not-allowed disabled:opacity-40',
                variant === 'outlined' ? `flex items-center justify-center gap-1.5 rounded-[2px] border-2 ${selected ? 'border-crimson bg-elevated font-bold text-ink [&>svg]:text-crimson-ink' : 'border-transparent text-muted hover:text-ink'}` : selected
                  ? 'bg-crimson font-bold text-on-accent shadow-[inset_0_0_0_2px_var(--app-on-accent)]'
                  : 'text-muted hover:text-ink active:text-ink',
              ].join(' ')}
            >
              {selected && variant === 'default' ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-on-accent"
                />
              ) : null}
              {option.icon}
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

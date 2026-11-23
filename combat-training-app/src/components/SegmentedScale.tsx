import type { PointerEvent, ReactNode } from 'react'
import { scaleValueFromKey, scaleValueFromPosition } from './scaleValue'

export function SegmentedScale({ value, onChange, min, max, label, valueText, describedBy, disabled = false, uniformFill = false, className = 'h-16', children }: {
  value: number | null
  onChange: (value: number) => void
  min: number
  max: number
  label: string
  valueText: string
  describedBy: string
  disabled?: boolean
  uniformFill?: boolean
  className?: string
  children?: ReactNode
}) {
  function selectPosition(event: PointerEvent<HTMLDivElement>) {
    if (disabled) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const next = scaleValueFromPosition(event.clientX, bounds.left, bounds.width, min, max)
    if (next !== null) onChange(next)
  }

  return <div role="slider" tabIndex={disabled ? -1 : 0} aria-disabled={disabled || undefined}
    // ARIA requires a numeric position. Until selection, valuetext announces the empty state;
    // the form value stays null and no segment is filled.
    aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value ?? min}
    aria-valuetext={valueText} aria-describedby={describedBy} aria-orientation="horizontal"
    className={`flex touch-none select-none gap-[3px] rounded-[2px] ${className}`}
    onKeyDown={(event) => {
      if (disabled) return
      const next = scaleValueFromKey(value, event.key, min, max)
      if (next !== null) { event.preventDefault(); onChange(next) }
    }}
    onPointerDown={(event) => {
      if (disabled || !event.isPrimary || event.button !== 0) return
      event.preventDefault()
      event.currentTarget.focus()
      event.currentTarget.setPointerCapture(event.pointerId)
      selectPosition(event)
    }}
    onPointerMove={(event) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) selectPosition(event)
    }}
    onPointerUp={(event) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        selectPosition(event)
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    }}>
    {children ?? Array.from({ length: max - min + 1 }, (_, index) => min + index).map((segment) => <span key={segment} aria-hidden="true"
      className={`min-w-0 flex-1 rounded-[2px] ${value === segment ? 'border-2 border-ink' : 'border border-bd'}`}
      style={{ backgroundColor: value !== null && segment <= value
        ? `color-mix(in srgb, var(--app-crimson) ${uniformFill ? 20 : 20 + (segment - min) * 8}%, var(--app-surface))`
        : 'var(--app-surface)' }} />)}
  </div>
}

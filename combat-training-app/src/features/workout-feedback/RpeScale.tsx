import { useId, type PointerEvent } from 'react'
import { rpeLabels as labels } from './rpeLabels'
import { rpeValueFromKey, rpeValueFromPosition, stepRpeValue } from './rpeValue'

export function RpeScale({ value, onChange, compact = false, disabled = false }: {
  value: number | null
  onChange: (value: number) => void
  compact?: boolean
  disabled?: boolean
}) {
  const id = useId()
  const description = value === null ? labels.question : labels.descriptions[value] || labels.between[value]

  function selectPosition(event: PointerEvent<HTMLDivElement>) {
    if (disabled) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const next = rpeValueFromPosition(event.clientX, bounds.left, bounds.width)
    if (next !== null) onChange(next)
  }

  return <div className="space-y-3">
    <div className={`text-center ${compact ? 'pt-2' : 'pt-6'}`} aria-live="polite" aria-atomic="true">
      <p className={`font-display font-extrabold leading-none tabular-nums text-ink ${compact ? 'text-[56px]' : 'text-[96px]'}`}>{value ?? '—'}</p>
      <p id={`${id}-description`} className={`mt-2 min-h-12 font-semibold text-ink ${compact ? 'text-base' : 'text-xl'}`}>{description}</p>
    </div>
    <div role="slider" tabIndex={disabled ? -1 : 0} aria-disabled={disabled || undefined}
      // ARIA requires a numeric position. Until selection, valuetext announces the empty state;
      // the form value stays null and no segment is filled.
      aria-label={labels.scale} aria-valuemin={0} aria-valuemax={10} aria-valuenow={value ?? 0}
      aria-valuetext={value === null ? labels.noSelection : `${value} · ${description}`}
      aria-describedby={`${id}-description`} aria-orientation="horizontal"
      className="flex h-16 touch-none select-none gap-[3px] rounded-[2px]"
      onKeyDown={(event) => {
        if (disabled) return
        const next = rpeValueFromKey(value, event.key)
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
      {labels.descriptions.map((_, index) => <span key={index} aria-hidden="true"
        className={`flex min-w-0 flex-1 items-center justify-center rounded-[2px] border ${value === index ? 'border-ink' : 'border-bd'}`}
        style={{ backgroundColor: value !== null && index <= value
          ? `color-mix(in srgb, var(--app-crimson) ${20 + index * 8}%, var(--app-surface))`
          : 'var(--app-surface)' }}>
        {value === index && <span className="flex size-5 items-center justify-center rounded-[2px] bg-surface font-bold text-ink">✓</span>}
      </span>)}
    </div>
    <div aria-hidden="true" className="flex justify-between text-xs text-muted"><span>{labels.lowAnchor}</span><span>{labels.middleAnchor}</span><span>{labels.highAnchor}</span></div>
    <div className="flex justify-center gap-4">
      <button type="button" disabled={disabled} aria-label={labels.less} onClick={() => onChange(stepRpeValue(value, -1))}
        className="min-h-touch w-16 rounded-[2px] border border-bd bg-surface text-[22px] text-ink">−</button>
      <button type="button" disabled={disabled} aria-label={labels.more} onClick={() => onChange(stepRpeValue(value, 1))}
        className="min-h-touch w-16 rounded-[2px] border border-bd bg-surface text-[22px] text-ink">+</button>
    </div>
  </div>
}

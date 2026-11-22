import { useId } from 'react'
import { SegmentedScale } from '@/components/SegmentedScale'
import { rpeLabels as labels } from './rpeLabels'
import { stepRpeValue } from './rpeValue'
import { workoutFeedbackLabels } from './workoutFeedbackLabels'

export function RpeSegments({ value }: { value: number | null }) {
  return <div aria-hidden="true" className="rpe-segments">
    {Array.from({ length: 11 }, (_, index) => <span key={index}
      className={value === index ? 'is-current' : value !== null && index < value ? 'is-filled' : undefined} />)}
  </div>
}

export function RpeScale({ value, onChange, compact = false, disabled = false }: {
  value: number | null
  onChange: (value: number) => void
  compact?: boolean
  disabled?: boolean
}) {
  const id = useId()
  const description = value === null ? (compact ? labels.question : labels.noSelection) : labels.descriptions[value] || labels.between[value]
  const scale = <SegmentedScale value={value} onChange={onChange} min={0} max={10} disabled={disabled}
    label={labels.scale} valueText={value === null ? labels.noSelection : `${value} · ${description}`}
    describedBy={`${id}-description`} className={compact ? undefined : 'rpe-telemetry-slider'}>
    {compact ? undefined : <RpeSegments value={value} />}
  </SegmentedScale>

  if (!compact) return <div className="space-y-1.5">
    <div className="space-y-0.5 pt-1.5 text-center" aria-live="polite" aria-atomic="true">
      <p className="font-display text-[44px] leading-none font-black tracking-tight tabular-nums text-ember-ink">{value ?? '—'}</p>
      <p id={`${id}-description`} className="font-display text-[15px] font-extrabold text-ink">{description}</p>
    </div>
    {scale}
    <div className="flex items-center justify-between gap-2">
      <button type="button" disabled={disabled} aria-label={labels.less} onClick={() => onChange(stepRpeValue(value, -1))}
        className="rpe-step motion-press">−</button>
      <span aria-hidden="true" className="text-center text-[11px] text-muted">{workoutFeedbackLabels.rpeRange}</span>
      <button type="button" disabled={disabled} aria-label={labels.more} onClick={() => onChange(stepRpeValue(value, 1))}
        className="rpe-step motion-press">+</button>
    </div>
  </div>

  return <div className="space-y-3">
    <div className="pt-2 text-center" aria-live="polite" aria-atomic="true">
      <p className="font-display text-[56px] leading-none font-extrabold tabular-nums text-ink">{value ?? '—'}</p>
      <p id={`${id}-description`} className="mt-2 min-h-12 text-base font-semibold text-ink">{description}</p>
    </div>
    {scale}
    <div aria-hidden="true" className="flex justify-between text-xs text-muted"><span>{labels.lowAnchor}</span><span>{labels.middleAnchor}</span><span>{labels.highAnchor}</span></div>
    <div className="flex justify-center gap-4">
      <button type="button" disabled={disabled} aria-label={labels.less} onClick={() => onChange(stepRpeValue(value, -1))}
        className="min-h-touch w-16 rounded-[2px] border border-bd bg-surface text-[22px] text-ink">−</button>
      <button type="button" disabled={disabled} aria-label={labels.more} onClick={() => onChange(stepRpeValue(value, 1))}
        className="min-h-touch w-16 rounded-[2px] border border-bd bg-surface text-[22px] text-ink">+</button>
    </div>
  </div>
}

import { useId } from 'react'
import { SegmentedScale } from '@/components/SegmentedScale'
import { rpeLabels as labels } from './rpeLabels'
import { stepRpeValue } from './rpeValue'

export function RpeScale({ value, onChange, compact = false, disabled = false }: {
  value: number | null
  onChange: (value: number) => void
  compact?: boolean
  disabled?: boolean
}) {
  const id = useId()
  const description = value === null ? labels.question : labels.descriptions[value] || labels.between[value]

  return <div className="space-y-3">
    <div className={`text-center ${compact ? 'pt-2' : 'pt-6'}`} aria-live="polite" aria-atomic="true">
      <p className={`font-display font-extrabold leading-none tabular-nums text-ink ${compact ? 'text-[56px]' : 'text-[96px]'}`}>{value ?? '—'}</p>
      <p id={`${id}-description`} className={`mt-2 min-h-12 font-semibold text-ink ${compact ? 'text-base' : 'text-xl'}`}>{description}</p>
    </div>
    <SegmentedScale value={value} onChange={onChange} min={0} max={10} disabled={disabled}
      label={labels.scale} valueText={value === null ? labels.noSelection : `${value} · ${description}`}
      describedBy={`${id}-description`} />
    <div aria-hidden="true" className="flex justify-between text-xs text-muted"><span>{labels.lowAnchor}</span><span>{labels.middleAnchor}</span><span>{labels.highAnchor}</span></div>
    <div className="flex justify-center gap-4">
      <button type="button" disabled={disabled} aria-label={labels.less} onClick={() => onChange(stepRpeValue(value, -1))}
        className="min-h-touch w-16 rounded-[2px] border border-bd bg-surface text-[22px] text-ink">−</button>
      <button type="button" disabled={disabled} aria-label={labels.more} onClick={() => onChange(stepRpeValue(value, 1))}
        className="min-h-touch w-16 rounded-[2px] border border-bd bg-surface text-[22px] text-ink">+</button>
    </div>
  </div>
}

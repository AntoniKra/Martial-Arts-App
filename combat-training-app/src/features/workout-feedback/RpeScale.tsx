import { useId } from 'react'
import { rpeLabels as labels } from './rpeLabels'

export function RpeScale({ value, onChange }: { value: number | null; onChange: (value: number) => void }) {
  const name = useId()
  return <div className="divide-y divide-bd border border-bd" role="radiogroup" aria-label={labels.scale}>
    {labels.descriptions.map((description, index) => <label key={index}
      className={`flex min-h-touch cursor-pointer items-center gap-3 px-3 py-2 ${value === index ? 'bg-elevated font-semibold' : 'bg-surface'}`}>
      <input type="radio" name={name} value={index} checked={value === index} onChange={() => onChange(index)} className="size-4 shrink-0 accent-crimson" />
      <span className="w-6 font-display text-lg font-bold tabular-nums text-ink">{index}</span>
      {description && <span className="text-[13px] text-ink">{description}</span>}
    </label>)}
  </div>
}

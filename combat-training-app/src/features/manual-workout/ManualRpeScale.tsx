import { useId } from 'react'
import { rpeLabels } from '@/features/workout-feedback/rpeLabels'

const between: Record<number, string> = {
  6: 'Między ciężko a bardzo ciężko', 8: 'Między bardzo ciężko a maksymalnie', 9: 'Między bardzo ciężko a maksymalnie',
}

export function ManualRpeScale({ value, onChange }: { value: number | null; onChange: (value: number) => void }) {
  const id = useId()
  return <div className="space-y-2">
    <div role="radiogroup" aria-label={rpeLabels.scale} aria-describedby={`${id}-description`} className="grid grid-cols-6 gap-1">
      {rpeLabels.descriptions.map((description, index) => <label key={index}
        className={`flex min-h-touch cursor-pointer items-center justify-center gap-1 border text-sm tabular-nums ${value === index ? 'border-crimson bg-elevated font-semibold' : 'border-bd bg-surface'}`}>
        <input type="radio" name={id} checked={value === index} aria-label={`${index} ${description || between[index]}`}
          onChange={() => onChange(index)} className="size-3 accent-crimson" /><span aria-hidden="true">{index}</span>
      </label>)}
    </div>
    <p id={`${id}-description`} aria-live="polite" className="min-h-5 text-sm text-muted">
      {value === null ? rpeLabels.question : `${value} · ${rpeLabels.descriptions[value] || between[value]}`}
    </p>
  </div>
}

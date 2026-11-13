import { useId } from 'react'
import { QUICK_TIMER_CATEGORIES, type QuickTimerCategory } from '@/domain/quick-timer/quickTimer'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { quickTimerLabels as labels } from './quickTimerLabels'

export function QuickTimerCategoryField({ value, onChange, error }: {
  value: QuickTimerCategory | null; onChange: (value: QuickTimerCategory) => void; error?: string
}) {
  const errorId = useId()
  return <fieldset className="min-w-0 space-y-2">
    <legend className="mb-2 font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{labels.category}</legend>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {QUICK_TIMER_CATEGORIES.map((category) => <button key={category} type="button" aria-pressed={value === category}
        aria-invalid={!!error} aria-describedby={error ? errorId : undefined} onClick={() => onChange(category)}
        className={`min-h-touch border px-3 py-3 text-sm font-semibold ${value === category ? 'border-crimson bg-elevated text-ink' : 'border-bd bg-surface text-muted'}`}>
        {value === category && <span aria-hidden="true">✓ </span>}{getWorkoutBlockLabelPl(category)}
      </button>)}
    </div>
    {error && <p id={errorId} role="alert" className="text-xs text-crimson-ink">{error}</p>}
  </fieldset>
}

import { useId } from 'react'
import { QUICK_TIMER_CATEGORIES, type QuickTimerCategory } from '@/domain/quick-timer/quickTimer'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { quickTimerLabels as labels } from './quickTimerLabels'

export function QuickTimerCategoryField({ value, onChange, error }: {
  value: QuickTimerCategory | null; onChange: (value: QuickTimerCategory) => void; error?: string
}) {
  const errorId = useId()
  return <fieldset className="min-w-0">
    <legend className="quick-timer-legend">{labels.category}</legend>
    <div className="grid grid-cols-2 gap-2">
      {QUICK_TIMER_CATEGORIES.map((category) => <button key={category} type="button" aria-pressed={value === category}
        aria-invalid={!!error} aria-describedby={error ? errorId : undefined} onClick={() => onChange(category)}
        className="quick-timer-choice px-3">
        {getWorkoutBlockLabelPl(category)}
      </button>)}
    </div>
    {error && <p id={errorId} role="alert" className="mt-2 text-xs text-crimson-ink">{error}</p>}
  </fieldset>
}

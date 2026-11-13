import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { manualWorkoutLabels as labels } from './manualWorkoutLabels'

export function ManualWorkoutLink({ from }: { from: '/' | '/workouts?tab=history' }) {
  return <Link to={routes.newManualWorkout} state={{ returnTo: from }}
    className="mt-3 flex min-h-touch items-center border border-bd bg-elevated px-4 py-3 text-sm font-semibold text-ink hover:border-muted">
    {labels.add}
  </Link>
}

import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { homeLabels as labels } from '../homeLabels'
import { HomeActionIcon } from './HomeActionIcon'

const shortcuts = {
  plans: { ...labels.plansShortcut, to: routes.workouts, icon: 'list' },
  exercises: { ...labels.exercisesShortcut, to: routes.myExercises, icon: 'book' },
} as const

export function WorkoutShortcutLink({ kind }: { kind: keyof typeof shortcuts }) {
  const { title, description, to, icon } = shortcuts[kind]
  return <Link to={to} className="workout-shortcut">
    <span className="workout-shortcut-icon"><HomeActionIcon kind={icon} className="size-5" strokeWidth={2} /></span>
    <span className="min-w-0 flex-1">
      <span className="block font-display text-[13.5px] font-bold">{title}</span>
      <span className="mt-px block text-[11px] text-muted">{description}</span>
    </span>
    <HomeActionIcon kind="right" className="size-4 shrink-0 text-muted" strokeWidth={2} />
  </Link>
}

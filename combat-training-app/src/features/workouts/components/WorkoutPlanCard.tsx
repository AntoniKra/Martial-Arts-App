import { Link } from 'react-router-dom'

import { routes } from '@/app/routes'
import { getButtonClassName } from '@/components/ui/Button'
import { DisciplineBadge } from '@/components/domain/DisciplineBadge'
import type { WorkoutPlanListItem } from '@/features/workouts/types/workoutsView.types'

interface WorkoutPlanCardProps {
  plan: WorkoutPlanListItem
}

const statItems = [
  { key: 'exercises', label: 'ćwiczenia', value: (plan: WorkoutPlanListItem) => plan.exerciseCount },
  { key: 'rounds', label: 'rundy', value: (plan: WorkoutPlanListItem) => plan.roundCount },
  {
    key: 'minutes',
    label: 'min',
    value: (plan: WorkoutPlanListItem) => `~${plan.estimatedMinutes} min`,
  },
] as const

export function WorkoutPlanCard({ plan }: WorkoutPlanCardProps) {
  return (
    <article className="flex h-full flex-col overflow-hidden border border-bd bg-surface">
      <div className="flex flex-1 flex-col px-4 pt-4 pb-3">
        <DisciplineBadge disciplineKey={plan.disciplineKey} />
        <h3 className="mt-1 font-display text-[15px] font-semibold leading-snug text-ink">{plan.name}</h3>
        {plan.goal ? (
          <p className="mt-0.5 text-[12px] leading-snug text-muted">{plan.goal}</p>
        ) : null}
        <dl className="mt-3 flex gap-4 font-display text-[11px] text-muted">
          {statItems.map((item) => (
            <div key={item.key}>
              <dt className="sr-only">{item.label}</dt>
              <dd>
                {item.key === 'minutes' ? (
                  <span className="font-semibold tabular-nums text-ink">{item.value(plan)}</span>
                ) : (
                  <>
                    <span className="font-semibold tabular-nums text-ink">{item.value(plan)}</span>{' '}
                    {item.label}
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <Link
        to={routes.workoutActive(plan.id)}
        className={getButtonClassName({
          variant: 'secondary',
          size: 'md',
          className: 'mt-auto w-full shrink-0 rounded-none border-t border-bd uppercase tracking-[0.08em]',
        })}
      >
        Rozpocznij
      </Link>
    </article>
  )
}

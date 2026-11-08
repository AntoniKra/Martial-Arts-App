import { Link } from 'react-router-dom'

import { routes } from '@/app/routes'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { DisciplineBadge } from '@/components/domain/DisciplineBadge'
import { polishPlural } from '@/domain/language/polishPlural'
import type { WorkoutPlanListItem } from '@/features/workouts/types/workoutsView.types'

interface WorkoutPlanCardProps {
  plan: WorkoutPlanListItem
}

interface PlanStat {
  key: string
  termPl: string
  value: string
  unitPl: string | null
}

function getPlanStats(plan: WorkoutPlanListItem): PlanStat[] {
  return [
    {
      key: 'exercises',
      termPl: 'Liczba ćwiczeń',
      value: String(plan.exerciseCount),
      unitPl: polishPlural(plan.exerciseCount, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń'),
    },
    {
      key: 'rounds',
      termPl: 'Liczba rund',
      value: String(plan.roundCount),
      unitPl: polishPlural(plan.roundCount, 'runda', 'rundy', 'rund'),
    },
    {
      key: 'duration',
      termPl: 'Szacowany czas',
      value: `ok. ${plan.estimatedDurationLabelPl}`,
      unitPl: null,
    },
  ]
}

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
          {getPlanStats(plan).map((stat) => (
            <div key={stat.key}>
              <dt className="sr-only">{stat.termPl}</dt>
              <dd>
                <span className="font-semibold tabular-nums text-ink">{stat.value}</span>
                {stat.unitPl ? ` ${stat.unitPl}` : null}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <Link
        to={routes.workoutDetails(plan.id)}
        className={getButtonClassName({
          variant: 'secondary',
          size: 'md',
          className: 'mt-auto w-full shrink-0 rounded-none border-t border-bd uppercase tracking-[0.08em]',
        })}
      >
        Zobacz plan
      </Link>
    </article>
  )
}

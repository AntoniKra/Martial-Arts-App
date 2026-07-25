import { Link } from 'react-router-dom'

import { routes } from '@/app/routes'
import { DisciplineBadge } from '@/components/domain/DisciplineBadge'
import { getButtonClassName } from '@/components/ui/Button'
import { RedAccent } from '@/components/ui/RedAccent'
import { HomeSectionLabel } from '@/features/home/components/HomeSectionLabel'
import type { HomeFeaturedPlan } from '@/features/home/types/homeView.types'

interface FeaturedPlanCardProps {
  plan: HomeFeaturedPlan
}

const statItems = [
  {
    key: 'exercises',
    label: 'Ćwiczenia',
    alignment: 'start',
    value: (plan: HomeFeaturedPlan) => plan.exerciseCount,
  },
  {
    key: 'rounds',
    label: 'Rundy',
    alignment: 'center',
    value: (plan: HomeFeaturedPlan) => plan.roundCount,
  },
  {
    key: 'minutes',
    label: '~Min',
    alignment: 'end',
    value: (plan: HomeFeaturedPlan) => plan.estimatedMinutes,
  },
] as const

const statAlignmentClasses = {
  start: 'justify-self-start text-left',
  center: 'justify-self-center text-center',
  end: 'justify-self-end text-right',
} as const

export function FeaturedPlanCard({ plan }: FeaturedPlanCardProps) {
  return (
    <section aria-labelledby="home-featured-plan-heading">
      <HomeSectionLabel className="mb-3 block">Aktywny plan</HomeSectionLabel>
      <div className="overflow-hidden border border-bd bg-surface">
        <div className="px-4 pt-4 pb-1">
          <DisciplineBadge disciplineKey={plan.disciplineKey} />
          <h2
            id="home-featured-plan-heading"
            className="mt-1 font-display text-[20px] font-bold leading-snug text-ink"
          >
            {plan.name}
          </h2>
          <p className="mt-1 text-[12px] leading-snug text-muted">{plan.goal}</p>
          <dl className="mt-3 grid grid-cols-3 gap-x-3 pb-3">
            {statItems.map((item) => (
              <div
                key={item.key}
                className={`min-w-0 ${statAlignmentClasses[item.alignment]}`}
              >
                <dt className="font-display text-[10px] uppercase tracking-[0.06em] text-muted">
                  {item.label}
                </dt>
                <dd className="font-display text-[18px] font-bold tabular-nums text-ink">
                  {item.value(plan)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <RedAccent />
        <Link
          to={routes.workoutActive(plan.id)}
          className={getButtonClassName({
            variant: 'primary',
            size: 'lg',
            className: 'w-full rounded-none uppercase tracking-[0.1em]',
          })}
        >
          Rozpocznij trening
        </Link>
      </div>
    </section>
  )
}

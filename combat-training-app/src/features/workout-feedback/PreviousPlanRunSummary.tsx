import { useId } from 'react'
import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon'
import type { PreviousPlanRun } from '@/domain/workout-session/previousPlanRun'
import { LazyWellbeingWorkoutLine } from '@/features/wellbeing/LazyWellbeingWorkoutLine'
import { formatWorkoutFeedbackMetrics, workoutFeedbackLabels as labels } from './workoutFeedbackLabels'

export function PreviousPlanRunSummary({ previous }: { previous: PreviousPlanRun }) {
  const { session, planChanged } = previous
  const metricsId = useId()
  return <section aria-label={labels.previousPlanRunMetrics} className="rounded-b-sm border-t border-bd bg-elevated text-xs text-muted">
    <div className="relative flex min-h-touch items-center px-3.5 py-2.5 hover:bg-surface">
      <dl id={metricsId} className="grid w-full grid-cols-3 gap-2 pr-6">
        {formatWorkoutFeedbackMetrics(session).map((value, index) => <div key={labels.metrics[index]} className="min-w-0 text-center">
          <dt className="text-[10px] font-bold tracking-wide uppercase">{labels.metrics[index]}</dt>
          <dd className="font-display text-sm font-extrabold tabular-nums text-ink">{value}</dd>
        </div>)}
      </dl>
      <Link to={routes.workoutFeedback(session.id)} aria-label={labels.viewPreviousPlanRun} aria-describedby={metricsId}
        className="absolute inset-0 flex items-center justify-end px-3.5">
        <ChevronRightIcon className="size-4 text-crimson-ink" />
      </Link>
    </div>
    <div className="px-3.5 pb-2.5 empty:hidden">
      <LazyWellbeingWorkoutLine date={session.workoutDate} previous />
      {planChanged && <p className="text-[13px] leading-relaxed text-muted">{labels.planChanged}</p>}
    </div>
  </section>
}

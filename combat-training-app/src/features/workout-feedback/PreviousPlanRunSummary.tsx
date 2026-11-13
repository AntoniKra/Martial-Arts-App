import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import type { PreviousPlanRun } from '@/domain/workout-session/previousPlanRun'
import { formatWorkoutSessionDatePl } from '@/features/workouts/utils/formatWorkoutSessionLabels'
import { formatWorkoutFeedbackMetrics, workoutFeedbackLabels as labels } from './workoutFeedbackLabels'

export function PreviousPlanRunSummary({ previous }: { previous: PreviousPlanRun }) {
  const { session, planChanged } = previous
  return <section aria-labelledby="previous-plan-run-heading" className="space-y-3 border border-bd bg-surface p-3">
    <div className="flex flex-wrap items-center justify-between gap-x-3">
      <h2 id="previous-plan-run-heading" className="font-display text-sm font-semibold text-ink">{labels.previousPlanRun(formatWorkoutSessionDatePl(session.completedAt))}</h2>
      <Link to={routes.workoutFeedback(session.id)} className="inline-flex min-h-touch min-w-touch items-center justify-center text-[12px] font-semibold text-ink">{labels.viewPreviousPlanRun}</Link>
    </div>
    <dl className="grid grid-cols-3 gap-2">
      {formatWorkoutFeedbackMetrics(session).map((value, index) => <div key={labels.metrics[index]} className="min-w-0 text-center">
        <dd className="font-display text-[22px] font-bold tabular-nums text-ink">{value}</dd>
        <dt className="mt-1 font-display text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">{labels.metrics[index]}</dt>
      </div>)}
    </dl>
    <p className="text-[13px] tabular-nums text-muted">{labels.previousPlanRunRpe(session.rpe)}</p>
    {planChanged && <p className="text-[13px] leading-relaxed text-muted">{labels.planChanged}</p>}
  </section>
}

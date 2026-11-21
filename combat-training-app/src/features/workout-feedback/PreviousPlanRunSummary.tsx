import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import type { PreviousPlanRun } from '@/domain/workout-session/previousPlanRun'
import { formatWorkoutSessionDatePl } from '@/features/workouts/utils/formatWorkoutSessionLabels'
import { formatWorkoutFeedbackMetrics, workoutFeedbackLabels as labels } from './workoutFeedbackLabels'
import { LazyWellbeingWorkoutLine } from '@/features/wellbeing/LazyWellbeingWorkoutLine'

export function PreviousPlanRunSummary({ previous }: { previous: PreviousPlanRun }) {
  const { session, planChanged } = previous
  return <section aria-labelledby="previous-plan-run-heading" className="rounded-b-sm border-t border-bd bg-elevated px-3.5 pb-2.5 text-xs text-muted">
    <div className="flex min-h-touch items-center justify-between gap-1.5">
      <div className="min-w-0 tabular-nums">
        <h2 id="previous-plan-run-heading" className="inline">{labels.previousPlanRun(formatWorkoutSessionDatePl(session.completedAt))}</h2>
        <span aria-hidden="true"> · </span><span className="whitespace-nowrap">{labels.previousPlanRunRpe(session.rpe)}</span>
      </div>
      <Link to={routes.workoutFeedback(session.id)} className="inline-flex min-h-touch min-w-touch shrink-0 items-center font-display text-[11px] font-extrabold tracking-wider text-crimson-ink uppercase">{labels.viewPreviousPlanRun}</Link>
    </div>
    <dl className="grid grid-cols-3 gap-2">
      {formatWorkoutFeedbackMetrics(session).map((value, index) => <div key={labels.metrics[index]} className="min-w-0 text-center">
        <dt className="text-[10px] font-bold tracking-wide uppercase">{labels.metrics[index]}</dt>
        <dd className="font-display text-sm font-extrabold tabular-nums text-ink">{value}</dd>
      </div>)}
    </dl>
    <LazyWellbeingWorkoutLine date={session.workoutDate} previous />
    {planChanged && <p className="text-[13px] leading-relaxed text-muted">{labels.planChanged}</p>}
  </section>
}

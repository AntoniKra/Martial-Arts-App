import type { PreviousPlanRun } from '@/domain/workout-session/previousPlanRun'
import { formatWorkoutFeedbackMetrics, workoutFeedbackLabels as labels } from './workoutFeedbackLabels'
import { LazyWellbeingWorkoutLine } from '@/features/wellbeing/LazyWellbeingWorkoutLine'

export function PreviousPlanRunSummary({ previous }: { previous: PreviousPlanRun }) {
  const { session, planChanged } = previous
  return <section aria-label={labels.previousPlanRunMetrics} className="rounded-b-sm border-t border-bd bg-elevated px-3.5 py-2.5 text-xs text-muted">
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

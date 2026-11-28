import { workoutDataLabels } from '@/application/workoutDataLabels'
import { routes } from '@/app/routes'
import { RouteScreenHeader } from '@/components/ScreenHeader'
import { formatSecondsAsClock } from '@/domain/time/formatDuration'
import type { PlanWorkoutSession, QuickTimerWorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { workoutSessionName } from '@/features/workouts/utils/workoutSessionPresentation'
import { FeedbackIcon } from './FeedbackIcon'
import { workoutFeedbackLabels as labels } from './workoutFeedbackLabels'

export function WorkoutFeedbackSummary({ session, pending }: {
  session: PlanWorkoutSession | QuickTimerWorkoutSession
  pending: boolean
}) {
  const isPlan = session.source === 'plan'
  const statusColor = session.status === 'partial' ? 'text-ember-ink' : 'text-crimson-ink'
  const saveBadge = pending
    ? <span role="status" className="feedback-badge is-countdown">{workoutDataLabels.pending}</span>
    : isPlan ? <span className="feedback-badge is-saved"><FeedbackIcon kind="check" size={12} />{labels.savedBadge}</span> : null
  const duration = formatSecondsAsClock(Math.floor(session.durationSeconds))
  const work = formatSecondsAsClock(session.workSeconds)
  const completion = `${session.completion.completed}/${session.completion.planned}`

  return <div className="space-y-4">
    <RouteScreenHeader title={workoutSessionName(session)} variant="summary" fallback={routes.progressHistory}
      eyebrow={<p className={`font-display text-[11px] font-extrabold tracking-[0.12em] uppercase ${statusColor}`}>{labels.status[session.status]}</p>}
      action={saveBadge} />
    <section aria-label={labels.metricsHeading} className="feedback-surface feedback-summary-metrics">
      <dl className="grid grid-cols-2">
        <div className="feedback-session-time col-span-2 space-y-1 px-4 pt-4 pb-3.5">
          <dt className="feedback-eyebrow flex items-center gap-1.5"><FeedbackIcon kind="clock" size={13} />{labels.metrics.duration}</dt>
          <dd className="font-display text-[36px] leading-[1.05] font-black tracking-[-0.015em] tabular-nums text-ink max-[374px]:text-[34px]">{duration}</dd>
        </div>
        {[[labels.metrics.work, work], [isPlan ? labels.metrics.exercises : labels.metrics.rounds, completion]].map(([name, value]) => <div key={name}
          className="flex min-w-0 flex-col gap-0.5 border-t border-bd px-4 pt-[11px] pb-3 last:border-l last:pl-3.5">
          <dt className="order-last font-display text-[10px] font-bold tracking-[0.09em] text-muted uppercase">{name}</dt>
          <dd className="font-display text-xl leading-[1.15] font-extrabold tabular-nums text-ink">{value}</dd>
        </div>)}
      </dl>
    </section>
  </div>
}

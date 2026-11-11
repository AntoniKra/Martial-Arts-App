import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { useWorkoutData } from '@/application/workoutDataContext'
import { selectWeekPlan } from '@/application/week-plan/selectWeekPlan'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { calculateWeekPlanProgress } from '@/domain/week-plan/weekPlanProgress'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { weekPlanLabels as labels, weekLabel } from './weekPlanLabels'

export function WeekPlanDataMessage({ status }: { status: 'loading' | 'error' | 'incomplete' | 'outsideRange' }) {
  const { retryWeekPlans } = useWorkoutData()
  return <div className="space-y-3" role={status === 'error' ? 'alert' : 'status'}>
    <p className="text-sm text-muted">{labels[status]}</p>
    {status !== 'loading' && status !== 'outsideRange' && <button type="button" onClick={retryWeekPlans} className={getButtonClassName({ variant: 'secondary' })}>{labels.retry}</button>}
  </div>
}

export function WeekPlanProgress({ weekStart }: { weekStart: string }) {
  const { weekPlans, sessions, retrySessions } = useWorkoutData()
  const selected = selectWeekPlan(weekPlans, weekStart)
  if (selected.status !== 'ready') return <WeekPlanDataMessage status={selected.status} />
  if (sessions.status !== 'ready' || !sessions.complete || sessions.invalidDocumentIds.length > 0) {
    return <div className="space-y-3"><p role="status" className="text-sm text-muted">{labels.sessionsUnavailable}</p>
      {sessions.status !== 'loading' && <button type="button" className={getButtonClassName({ variant: 'secondary' })} onClick={retrySessions}>{labels.retrySessions}</button>}
    </div>
  }
  const progress = calculateWeekPlanProgress(weekStart, selected.plan, sessions.items)
  return <div className="space-y-3">
    {progress.hasGoal ? <>
      <p className="font-display text-lg font-semibold">Ukończone: {progress.completed} z {progress.total}</p>
      <div role="progressbar" aria-label="Ukończone cele tygodnia" aria-valuemin={0} aria-valuemax={progress.total}
        aria-valuenow={progress.completed} aria-valuetext={`${progress.completed} z ${progress.total} ukończonych`} className="h-2 bg-elevated">
        <div className="h-full bg-crimson" style={{ width: `${progress.percentage}%` }} />
      </div>
      <p className="text-sm text-muted">{labels.partial}: {progress.partial} · {labels.unfulfilled}: {progress.unfulfilled} · {labels.extra}: {progress.extra.length}</p>
    </> : <><p className="text-sm text-muted">{labels.empty}</p><p className="text-sm">Treningi w tygodniu: {progress.workoutCount}</p></>}
  </div>
}

export function WeekPlanSummary() {
  const { currentWeek, weekPlans } = useWorkoutData()
  const selected = selectWeekPlan(weekPlans, currentWeek)
  return <section aria-label={labels.title} className="space-y-3 border border-bd bg-surface p-4">
    <h2 className="font-display text-xl font-semibold">{labels.title}</h2>
    <p className="text-xs text-muted">{weekLabel(currentWeek)}</p>
    <WeekPlanProgress weekStart={currentWeek} />
    {weekPlans.pendingIds.has(currentWeek) && <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p>}
    {selected.status === 'ready' && selected.plan?.editedAfterWeekEnd && <p className="text-sm text-muted">{labels.historical}</p>}
    <Link to={routes.weekPlan(currentWeek)} className={getButtonClassName({ variant: 'secondary' })}>
      {selected.status === 'ready' && !selected.plan?.items.length ? labels.arrange : labels.details}
    </Link>
  </section>
}

import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import type { selectHomeSchedule } from '@/domain/week-plan/homeSchedule'
import type { WeekPlan } from '@/domain/week-plan/weekPlan.types'
import { selectRpeReminder } from '@/domain/workout-session/rpeReminder'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { scheduleLabels } from '@/features/week-plan/scheduleLabels'
import { useScheduledWeekActions } from '@/features/week-plan/useScheduledWeekActions'
import { workoutSessionName } from '@/features/workouts/utils/workoutSessionPresentation'
import { createRpeDismissalStorage } from '@/infrastructure/storage/rpeDismissalStorage'
import { homeLabels as labels } from '../homeLabels'
import { homeTodoExpanderLabel, selectHomeTodoTasks } from '../homeTodoTasks'
import { HomeActionIcon } from './HomeActionIcon'
import { HomeQuickLinkContent } from './HomeQuickLinkContent'

export function HomeTodoCard({ uid, sessions, overdue, plan, otherWeeks, today }: {
  uid?: string
  sessions?: readonly WorkoutSession[]
  overdue: ReturnType<typeof selectHomeSchedule>['overdue']
  plan: WeekPlan
  otherWeeks: readonly WeekPlan[]
  today: string
}) {
  const [now, setNow] = useState(Date.now)
  const [expanded, setExpanded] = useState(false)
  const headingId = useId()
  const extraTasksId = useId()
  const actions = useScheduledWeekActions(plan, true)
  const canRemind = !!uid && !!sessions

  useEffect(() => {
    if (!canRemind) return
    const refresh = () => setNow(Date.now())
    const timer = setInterval(refresh, 1000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [canRemind])

  const reminder = uid && sessions ? selectRpeReminder(sessions, createRpeDismissalStorage(uid).read(), now) : null
  const tasks = selectHomeTodoTasks(overdue, reminder, today)
  const [first, ...remaining] = tasks
  if (!first) return null

  function renderTask(task: (typeof tasks)[number]) {
    if (task.kind === 'rpe') {
      const { session } = task
      return <Link key={session.id} to={`${routes.workoutFeedback(session.id)}?rpe=1`} className="quick-link-row-5a">
        <HomeQuickLinkContent icon="clock" title={labels.rateRpe} subtitle={labels.rateRpeHint(workoutSessionName(session), session.workoutDate)} />
      </Link>
    }

    const { item, prefill } = task
    const source = prefill.weekStart === plan.weekStart ? plan : otherWeeks.find((week) => week.weekStart === prefill.weekStart)
    return <div key={`${prefill.weekStart}:${item.id}`} className="todo-club-item">
      <div className="todo-item-top">
        <span className="home-card-date">{labels.overdueWorkout}</span>
        <span className="home-neutral-badge">{labels.overdueBadge(prefill.workoutDate, labels.discipline(prefill.disciplineKey))}</span>
      </div>
      <h3 className="todo-item-title">{labels.occurred}</h3>
      <div className="home-action-tiles">
        <Link to={routes.newManualWorkout} state={{ weekEntry: prefill, returnTo: routes.home }} className="home-secondary-action">
          <span className="home-tile-icon"><HomeActionIcon kind="entry" /></span><span>{labels.write}</span>
        </Link>
        <button type="button" disabled={actions.busy || !source} className="home-secondary-action"
          onClick={() => { if (source) void actions.toggleOmitted(item, source) }}>
          <span className="home-tile-icon"><HomeActionIcon kind="close" /></span><span>{scheduleLabels.omit}</span>
        </button>
      </div>
    </div>
  }

  return <section aria-labelledby={headingId} className="todo-section-container">
    <div className="todo-section-header">
      <h2 id={headingId} className="home-card-date">{labels.todo}</h2>
      <span className="home-neutral-badge">{labels.taskCount(tasks.length)}</span>
    </div>
    <div className="card-todo-unified">
      {renderTask(first)}
      {remaining.length > 0 && <>
        <div className="todo-expander-divider" />
        <button type="button" className="todo-expander-btn" aria-expanded={expanded} aria-controls={extraTasksId}
          onClick={() => setExpanded(!expanded)}>
          <span className="todo-expander-left">
            <span className="todo-more-pill">{labels.moreTasks(remaining.length)}</span>
            <span className="todo-expander-label">{homeTodoExpanderLabel(remaining)}</span>
          </span>
          <HomeActionIcon kind="down" className="todo-expander-arrow" />
        </button>
        <div id={extraTasksId} hidden={!expanded}>
          <div className="todo-expanded-box">{remaining.map(renderTask)}</div>
        </div>
      </>}
      {actions.error && <p role="alert" className="text-sm text-crimson-ink">{actions.error}</p>}
    </div>
  </section>
}

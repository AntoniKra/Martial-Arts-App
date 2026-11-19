import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { clubWorkoutPrefill } from '@/domain/week-plan/clubWorkoutPrefill'
import type { selectHomeSchedule } from '@/domain/week-plan/homeSchedule'
import type { ScheduledWeekItem, WeekPlan } from '@/domain/week-plan/weekPlan.types'
import { manualPartsLabel } from '@/features/manual-workout/manualWorkoutLabels'
import { activityTitle, scheduleLabels, weekdays } from '@/features/week-plan/scheduleLabels'
import { useScheduledWeekActions } from '@/features/week-plan/useScheduledWeekActions'
import { homeCardDate, homeLabels as labels, homeShortDate } from '../homeLabels'
import { StormDecoration } from './StormDecoration'
import { ScheduleStatusBadge } from '@/features/week-plan/ScheduleStatusBadge'
import { HomeActionIcon } from './HomeActionIcon'
import { HomeParameterChip } from './HomeParameterChip'

type Schedule = ReturnType<typeof selectHomeSchedule>
export const homeSecondaryButton = 'inline-flex min-h-touch items-center justify-center border border-bd bg-elevated px-3.5 text-[13px] font-semibold text-ink hover:bg-bd disabled:opacity-40'
export const homePrimaryButton = 'home-primary-action'
export const homeSectionLabel = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-muted'
export const homeInlineLink = 'inline-flex min-h-touch items-center text-[13px] text-crimson-ink '

export function HomeTodayActions({ item, actions, moving, onMoving }: {
  item: ScheduledWeekItem; actions: ReturnType<typeof useScheduledWeekActions>; moving: boolean; onMoving: () => void
}) {
  return <>
    <div className="home-action-tiles">
      <button type="button" disabled={actions.busy} className="home-secondary-action" onClick={() => { void actions.toggleOmitted(item) }}><span className="home-tile-icon"><HomeActionIcon kind="omit" /></span>{scheduleLabels.omit}</button>
      <button type="button" disabled={actions.busy} aria-expanded={moving} className="home-secondary-action" onClick={onMoving}><span className="home-tile-icon"><HomeActionIcon kind="move" /></span>{labels.moveDay}</button>
    </div>
    {moving && <label className="text-sm text-muted">{scheduleLabels.move}<select className="mt-1 block min-h-touch w-full border border-bd bg-input px-3 text-base text-ink" value={item.day ?? ''} disabled={actions.busy} onChange={(event) => {
      const day = weekdays.find(({ day }) => String(day) === event.target.value)?.day
      if (day !== undefined) void actions.move(item, day)
    }}>{weekdays.map(({ day, name }) => <option key={day} value={day}>{name}</option>)}</select></label>}
  </>
}

function ActionFeedback({ actions }: { actions: ReturnType<typeof useScheduledWeekActions> }) {
  return <>
    {actions.error && <p role="alert" className="p-4 text-sm text-crimson-ink">{actions.error}</p>}
    {actions.undo && <div role="status" className="flex flex-wrap items-center gap-2 p-4 text-sm text-muted">
      <p>{scheduleLabels.moved}</p><button type="button" className={homeSecondaryButton} disabled={actions.busy} onClick={() => { void actions.undoMove() }}>{scheduleLabels.undo}</button>
    </div>}
  </>
}

export function HomeTodayCards({ plan, schedule, today, fallback }: { plan: WeekPlan; schedule: Schedule; today: string; fallback: ReactNode }) {
  const descriptionId = useId()
  const actions = useScheduledWeekActions(plan, true)
  const [moving, setMoving] = useState<string | null>(null)
  return <>
    {schedule.kind === 'club' ? schedule.todayClubs.map(({ item, status }) => {
      if (item.kind !== 'club') return null
      const prefill = clubWorkoutPrefill(plan.weekStart, item, today)
      return <section key={item.id} aria-label={`${labels.today} · ${labels.discipline(item.disciplineKey)} · ${item.startTime}`} className="storm-card home-main-card">
        <StormDecoration />
        <div className="home-card-meta">
          <p className="home-card-date">{homeCardDate(today)}</p>
          <span className="home-plan-badge">{labels.discipline(item.disciplineKey)} · {labels.club}</span>
        </div>
        <div>
          <h2 className="home-workout-name">{activityTitle(item)}</h2>
          <p className="home-workout-sub">{item.parts.length ? labels.usual(manualPartsLabel(item.parts).toLocaleLowerCase('pl')) : labels.noParts}</p>
        </div>
        <div className="home-param-chips">
          <HomeParameterChip kind="clock">{item.startTime}–{item.endTime}</HomeParameterChip>
          {item.clubName && <HomeParameterChip kind="club">{item.clubName}</HomeParameterChip>}
        </div>
        <div className="home-card-actions">
          {status === 'done' ? <div role="status" className="self-start"><ScheduleStatusBadge status="done" /></div> : prefill && <>
            <span id={`${descriptionId}-${item.id}`} className="sr-only">{labels.entryHint(labels.discipline(item.disciplineKey), prefill.durationMinutes)}</span>
            <Link to={routes.newManualWorkout} state={{ weekEntry: prefill, returnTo: routes.home }} aria-describedby={`${descriptionId}-${item.id}`} className={homePrimaryButton}>
              <HomeActionIcon kind="entry" />{labels.entry}
            </Link>
            <HomeTodayActions item={item} actions={actions} moving={moving === item.id} onMoving={() => setMoving(moving === item.id ? null : item.id)} />
          </>}
        </div>

      </section>
    }) : fallback}
    <ActionFeedback actions={actions} />
  </>
}

export function HomeOverdueWeek({ plan, entries, today }: { plan: WeekPlan; entries: Schedule['overdue']; today: string }) {
  const actions = useScheduledWeekActions(plan, true)
  return <>
    {entries.map(({ item, date }) => {
      const prefill = clubWorkoutPrefill(plan.weekStart, item, today)
      if (!prefill || !date) return null
      return <div key={item.id} className="space-y-2.5">
        <p className="text-[15px]"><strong>{homeShortDate(date)} · {activityTitle(item)} ({scheduleLabels.kinds.club})</strong> — {labels.missing}</p>
        <div className="flex flex-wrap gap-2">
          <Link to={routes.newManualWorkout} state={{ weekEntry: prefill, returnTo: routes.home }} className={homeSecondaryButton}>{labels.write}</Link>
          <button type="button" disabled={actions.busy} className={homeSecondaryButton} onClick={() => { void actions.toggleOmitted(item) }}>{scheduleLabels.omit}</button>
        </div>
      </div>
    })}
    <ActionFeedback actions={actions} />
  </>
}

export function HomePendingWeek() {
  const { weekPlans } = useWorkoutData()
  return weekPlans.hasPendingWrites ? <p role="status" className="text-xs text-muted">{workoutDataLabels.pending}</p> : null
}

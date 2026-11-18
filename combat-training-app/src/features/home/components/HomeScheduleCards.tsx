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
import { weekPlanLabels } from '@/features/week-plan/weekPlanLabels'
import { homeCardDate, homeLabels as labels, homeShortDate } from '../homeLabels'
import { StormDecoration } from './StormDecoration'
import { ScheduleStatusBadge } from '@/features/week-plan/ScheduleStatusBadge'
import { HomeActionIcon } from './HomeActionIcon'

type Schedule = ReturnType<typeof selectHomeSchedule>
export const homeSecondaryButton = 'inline-flex min-h-touch items-center justify-center border border-bd bg-elevated px-3.5 text-[13px] font-semibold text-ink hover:bg-bd disabled:opacity-40'
export const homePrimaryButton = 'home-primary-action inline-flex min-h-14 items-center gap-3 px-3.5 py-2.5 text-left text-[13px] font-extrabold'
export const homeSectionLabel = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-muted'
export const homeInlineLink = 'inline-flex min-h-touch items-center text-[13px] text-crimson-ink '

export function HomeTodayActions({ item, actions, moving, onMoving }: {
  item: ScheduledWeekItem; actions: ReturnType<typeof useScheduledWeekActions>; moving: boolean; onMoving: () => void
}) {
  return <>
    <div className="grid grid-cols-2 gap-2 px-4 pb-4 pt-2">
      <button type="button" disabled={actions.busy} className="home-secondary-action" onClick={() => { void actions.toggleOmitted(item) }}><HomeActionIcon kind="omit" />{scheduleLabels.omit}</button>
      <button type="button" disabled={actions.busy} aria-expanded={moving} className="home-secondary-action" onClick={onMoving}><HomeActionIcon kind="move" />{labels.moveDay}</button>
    </div>
    {moving && <label className="px-4 pb-4 text-sm text-muted">{scheduleLabels.move}<select className="mt-1 block min-h-touch w-full border border-bd bg-input px-3 text-base text-ink" value={item.day ?? ''} disabled={actions.busy} onChange={(event) => {
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
  const { plans } = useWorkoutData()
  return <>
    {schedule.kind === 'club' ? schedule.todayClubs.map(({ item, status }) => {
      if (item.kind !== 'club') return null
      const prefill = clubWorkoutPrefill(plan.weekStart, item, today)
      return <section key={item.id} aria-label={`${labels.today} · ${labels.discipline(item.disciplineKey)} · ${item.startTime}`} className="storm-card flex flex-col">
        <StormDecoration />
        {/* Keep the primary action in the lower half of the first phone screen. */}
        <div className={`flex flex-col gap-2 px-4 pb-3 pt-[18px] ${status === 'done' ? '' : 'min-h-[366px] md:min-h-0'}`}>
          <p className={`${homeSectionLabel} text-crimson-ink`}>{homeCardDate(today, 'club')}</p>
          <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-crimson-ink">{labels.discipline(item.disciplineKey)} · {labels.club}</p>
          <h2 className="storm-copy font-display text-[30px] font-extrabold leading-[1.05] tabular-nums">{item.startTime}–{item.endTime}</h2>
          <p className="storm-copy text-sm text-muted">{item.parts.length ? labels.usual(manualPartsLabel(item.parts).toLocaleLowerCase('pl')) : labels.noParts}</p>
        </div>
        {status === 'done' ? <div role="status" className="mx-4 mb-4 self-start"><ScheduleStatusBadge status="done" /></div> : prefill && <>
          <Link to={routes.newManualWorkout} state={{ weekEntry: prefill, returnTo: routes.home }} aria-describedby={`${descriptionId}-${item.id}`} className={`${homePrimaryButton} mx-4`}>
            <span className="home-primary-icon"><HomeActionIcon kind="entry" /></span>
            <span className="min-w-0"><span className="block">{labels.entry}</span><span id={`${descriptionId}-${item.id}`} aria-hidden="true" className="home-primary-description">{labels.entryHint(labels.discipline(item.disciplineKey), prefill.durationMinutes)}</span></span>
          </Link>
          <HomeTodayActions item={item} actions={actions} moving={moving === item.id} onMoving={() => setMoving(moving === item.id ? null : item.id)} />
        </>}
        {schedule.flexible.map(({ item }) => item.kind === 'own' && <div key={item.id} className="flex items-center justify-between gap-2 border-t border-bd px-4 py-3">
          <div className="min-w-0"><p className="text-xs text-muted">{labels.later}</p><p className="mt-0.5 break-words text-sm font-semibold tabular-nums">{item.planNameSnapshot ?? activityTitle(item)}</p></div>
          {item.workoutPlanId && plans.status === 'ready' && plans.complete && !plans.invalidDocumentIds.length && plans.items.some((plan) => plan.id === item.workoutPlanId)
            ? <Link to={routes.workoutActive(item.workoutPlanId)} className="inline-flex min-h-touch items-center border border-crimson px-3.5 text-[13px] font-bold">{scheduleLabels.start}</Link>
            : item.workoutPlanId && <p className="text-xs text-muted">{weekPlanLabels.unavailable}</p>}
        </div>)}
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

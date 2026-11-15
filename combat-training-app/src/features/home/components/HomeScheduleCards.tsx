import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { clubWorkoutPrefill } from '@/domain/week-plan/clubWorkoutPrefill'
import type { selectHomeSchedule } from '@/domain/week-plan/homeSchedule'
import type { WeekPlan } from '@/domain/week-plan/weekPlan.types'
import { manualPartsLabel } from '@/features/manual-workout/manualWorkoutLabels'
import { activityTitle, scheduleLabels, weekdays } from '@/features/week-plan/scheduleLabels'
import { useScheduledWeekActions } from '@/features/week-plan/useScheduledWeekActions'
import { weekPlanLabels } from '@/features/week-plan/weekPlanLabels'
import { homeLabels as labels, homeShortDate } from '../homeLabels'

type Schedule = ReturnType<typeof selectHomeSchedule>
export const homeSecondaryButton = 'inline-flex min-h-touch items-center justify-center border border-bd bg-elevated px-3.5 text-[13px] font-semibold text-ink hover:bg-bd disabled:opacity-40'
export const homePrimaryButton = 'inline-flex min-h-14 items-center justify-center gap-2 bg-crimson px-4 py-3 text-center text-[15px] font-bold uppercase tracking-[0.06em] text-on-accent hover:bg-crimson-hi'
export const homeSectionLabel = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-muted'
export const homeInlineLink = 'inline-flex min-h-touch items-center text-[13px] text-crimson-ink hover:underline'

function ActionFeedback({ actions }: { actions: ReturnType<typeof useScheduledWeekActions> }) {
  return <>
    {actions.error && <p role="alert" className="p-4 text-sm text-crimson-ink">{actions.error}</p>}
    {actions.undo && <div role="status" className="flex flex-wrap items-center gap-2 p-4 text-sm text-muted">
      <p>{scheduleLabels.moved}</p><button type="button" className={homeSecondaryButton} disabled={actions.busy} onClick={() => { void actions.undoMove() }}>{scheduleLabels.undo}</button>
    </div>}
  </>
}

export function HomeTodayCards({ plan, schedule, today, fallback }: { plan: WeekPlan; schedule: Schedule; today: string; fallback: ReactNode }) {
  const actions = useScheduledWeekActions(plan, true)
  const [moving, setMoving] = useState<string | null>(null)
  const { plans } = useWorkoutData()
  return <>
    {schedule.kind === 'club' ? schedule.todayClubs.map(({ item, status }) => {
      if (item.kind !== 'club') return null
      const prefill = clubWorkoutPrefill(plan.weekStart, item, today)
      return <section key={item.id} aria-label={`${labels.today} · ${labels.discipline(item.disciplineKey)} · ${item.startTime}`} className="flex flex-col border border-bd bg-surface">
        {/* Keep the primary action in the lower half of the first phone screen. */}
        <div className={`flex flex-col gap-1 px-4 pb-3 pt-4 ${status === 'done' ? '' : 'min-h-[282px] md:min-h-0'}`}>
          <p className={homeSectionLabel}>{labels.today}</p>
          <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-crimson-ink">{labels.discipline(item.disciplineKey)} · {labels.club}</p>
          <h2 className="font-display text-[22px] font-bold leading-tight tabular-nums">{item.startTime}–{item.endTime}</h2>
          <p className="text-sm text-muted">{item.parts.length ? labels.usual(manualPartsLabel(item.parts).toLocaleLowerCase('pl')) : labels.noParts}</p>
        </div>
        {status === 'done' ? <p role="status" className="px-4 pb-4 text-sm font-semibold">{scheduleLabels.statuses.done}</p> : prefill && <>
          <Link to={routes.newManualWorkout} state={{ weekEntry: prefill, returnTo: routes.home }} className={`${homePrimaryButton} mx-4`}>{labels.entry}</Link>
          <p className="mx-4 mt-2 text-xs text-faint">{labels.entryHint(labels.discipline(item.disciplineKey), prefill.durationMinutes)}</p>
          <div className="grid grid-cols-2 gap-2 px-4 pb-4 pt-3">
            <button type="button" disabled={actions.busy} className={`${homeSecondaryButton} min-h-12`} onClick={() => { void actions.toggleOmitted(item) }}>{labels.notGoing}</button>
            <button type="button" disabled={actions.busy} aria-expanded={moving === item.id} className={`${homeSecondaryButton} min-h-12`} onClick={() => setMoving(moving === item.id ? null : item.id)}>{scheduleLabels.move}</button>
          </div>
          {moving === item.id && <label className="px-4 pb-4 text-sm text-muted">{scheduleLabels.move}<select className="mt-1 block min-h-touch w-full border border-bd bg-input px-3 text-base text-ink" value={item.day} disabled={actions.busy} onChange={(event) => {
            const day = weekdays.find(({ day }) => String(day) === event.target.value)?.day
            if (day !== undefined) void actions.move(item, day)
          }}>{weekdays.map(({ day, name }) => <option key={day} value={day}>{name}</option>)}</select></label>}
        </>}
        {schedule.flexible.map(({ item }) => item.kind === 'own' && <div key={item.id} className="flex items-center justify-between gap-2 border-t border-bd px-4 py-3">
          <div className="min-w-0"><p className="text-xs text-muted">{labels.later}</p><p className="mt-0.5 break-words text-sm font-semibold tabular-nums">{item.planNameSnapshot ?? activityTitle(item)}</p></div>
          {item.workoutPlanId && plans.status === 'ready' && plans.complete && !plans.invalidDocumentIds.length && plans.items.some((plan) => plan.id === item.workoutPlanId)
            ? <Link to={routes.workoutActive(item.workoutPlanId)} className="inline-flex min-h-touch items-center border border-crimson px-3.5 text-[13px] font-bold">{scheduleLabels.start}</Link>
            : item.workoutPlanId && <p className="text-xs text-muted">{weekPlanLabels.unavailable}</p>}
        </div>)}
        <div className="flex items-center gap-1 border-t border-bd px-4 text-sm text-muted">
          <Link to={routes.quickTimer} className="inline-flex min-h-touch min-w-touch items-center">{labels.timer}</Link>
          <Link to={routes.workouts} className="flex min-h-touch flex-1 items-center justify-between py-3.5">{labels.otherPlansSuffix}<span aria-hidden="true">›</span></Link>
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

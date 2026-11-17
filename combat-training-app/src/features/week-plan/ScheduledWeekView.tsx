import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { changeScheduledWeek, generateScheduledWeek, recurringOccurrenceId } from '@/domain/week-plan/scheduledWeek'
import { scheduledWeekFromLegacy } from '@/domain/week-plan/updateRecurringWeek'
import { clubWorkoutPrefill } from '@/domain/week-plan/clubWorkoutPrefill'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import type { ScheduledWeekItem, WeekActivity, Weekday } from '@/domain/week-plan/weekPlan.types'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { useProfileToday } from '@/features/profile/useProfileToday'
import { workoutSessionName } from '@/features/workouts/utils/workoutSessionPresentation'
import { WeekActivitySheet } from './WeekActivitySheet'
import { WeekScheduleList } from './WeekScheduleList'
import { WeekSummaryDisclosure } from './WeekSummaryDisclosure'
import { activityDetail, activityTitle, recurringSummary, scheduleLabels as labels, scheduledWeekLabel, weekdays } from './scheduleLabels'
import { weekPlanLabels } from './weekPlanLabels'
import { useScheduledWeekActions } from './useScheduledWeekActions'
import { useRecurringWeekActions } from './useRecurringWeekActions'
import { selectWeekPlan } from '@/application/week-plan/selectWeekPlan'
import { WeekPlanDataMessage } from './WeekPlanSummary'
import { ScheduleStatusBadge } from './ScheduleStatusBadge'
import { calculateWeekPlanProgress } from '@/domain/week-plan/weekPlanProgress'

export function ScheduledWeekView({ weekStart, onRecurring }: { weekStart: string; onRecurring: () => void }) {
  const { weekPlans, recurringWeeks, weekPlanRepository, retryRecurringWeeks, plans, sessions, currentWeek, retrySessions } = useWorkoutData()
  const stored = weekPlans.items.find((plan) => plan.weekStart === weekStart)
  const recurring = recurringWeeks.items[0]
  const [openedAt] = useState(() => new Date())
  const plan = stored ? scheduledWeekFromLegacy(stored) : generateScheduledWeek(weekStart, recurring, openedAt)
  const [editing, setEditing] = useState<{ day: Weekday | null; initial?: WeekActivity } | null>(null)
  const [options, setOptions] = useState<string | null>(null)
  const [generationError, setGenerationError] = useState(false)
  const generation = useRef(false)
  const today = useProfileToday()
  const recurringReady = recurringWeeks.status === 'ready' && !recurringWeeks.invalidDocumentIds.length && (!!recurring || recurringWeeks.complete)
  const selected = selectWeekPlan(weekPlans, weekStart)
  const canEdit = selected.status === 'ready' && (!!stored || recurringReady)
  const { busy, error, undo, save, move, toggleOmitted, undoMove } = useScheduledWeekActions(plan, canEdit)
  const recurringActions = useRecurringWeekActions()
  const sessionsReady = sessions.status === 'ready' && sessions.complete && !sessions.invalidDocumentIds.length
  const progress = sessionsReady ? calculateWeekPlanProgress(weekStart, plan, sessions.items, today).scheduleProgress : null
  const availablePlans = plans.status === 'ready' && plans.complete && !plans.invalidDocumentIds.length ? plans.items : []

  useEffect(() => {
    if (!canEdit || stored || !recurring || !recurringReady || generation.current) return
    generation.current = true
    void weekPlanRepository.save(generateScheduledWeek(weekStart, recurring, openedAt)).catch(() => setGenerationError(true))
  }, [canEdit, stored, recurring, recurringReady, weekPlanRepository, weekStart, openedAt])

  async function saveEntry(items: WeekActivity[], repeat: boolean) {
    const before = plan.schedule ?? []
    const old = before.find((item) => item.id === editing?.initial?.id)
    const additions = items.map((item): ScheduledWeekItem => ({ ...item, id: crypto.randomUUID(), omitted: old?.omitted ?? false }))
    const target = Math.min(14, (plan.targetCount ?? 0) + additions.filter((item) => item.kind !== 'rest').length - (old && old.kind !== 'rest' ? 1 : 0))
    const schedule = [...before.filter((item) => item.id !== old?.id), ...additions]
    if (repeat) {
      const linked = old && recurring?.items.find((item, index) => old.id === recurringOccurrenceId(weekStart, item.id) || old.id === `${weekStart}:${index}`)
      const repeated = items.map((item) => ({ ...item, id: linked?.id ?? crypto.randomUUID() }))
      const repeatedSchedule = [...before.filter((item) => item.id !== old?.id), ...repeated.map((item) => ({ ...item, id: recurringOccurrenceId(weekStart, item.id), omitted: old?.omitted ?? false }))]
      await recurringActions.save([...(recurring?.items ?? []).filter((item) => item.id !== linked?.id), ...repeated], (current) => {
        if (current.weekStart !== weekStart) return changeScheduledWeek(plan, repeatedSchedule, target, new Date())
        const currentItems = current.schedule!.filter((item) => item.id !== old?.id)
        repeated.forEach((item) => {
          const id = recurringOccurrenceId(weekStart, item.id)
          if (!currentItems.some((entry) => entry.id === id)) currentItems.push({ ...item, id, omitted: false })
        })
        return changeScheduledWeek(current, currentItems, target, new Date())
      }, plan)
    } else if (!await save(schedule, target)) throw new Error('Week save failed')
    setOptions(null)
  }

  function entry(activity: WeekActivity) {
    const item = plan.schedule!.find((entry) => entry.id === activity.id)!
    const match = progress?.matches.find((match) => match.item.id === item.id)
    const launchable = item.kind === 'own' && item.workoutPlanId !== null && availablePlans.some((plan) => plan.id === item.workoutPlanId)
    const prefill = clubWorkoutPrefill(weekStart, item, today)
    const open = options === item.id
    return <div key={item.id}>
      <div className="flex min-h-touch items-center gap-2">
        <div className="min-w-0 flex-1"><p className="break-words text-[15px] font-bold">{activityTitle(item)}</p>{item.kind !== 'rest' && <p className="mt-0.5 break-words text-[13px] text-muted">{activityDetail(item)}</p>}</div>
        {match && item.kind !== 'rest' && <ScheduleStatusBadge status={match.status} />}
        <button type="button" aria-label={`Opcje: ${activityTitle(item)}`} aria-expanded={open} className="flex size-11 shrink-0 items-center justify-center text-xl text-muted" onClick={() => setOptions(open ? null : item.id)}>⋯</button>
      </div>
      {open && <div className="space-y-2 border-t border-bd py-2 text-xs text-muted">
        <div className="flex flex-wrap gap-2">
          {launchable && item.kind === 'own' && item.workoutPlanId && <Link to={routes.workoutActive(item.workoutPlanId)} className={getButtonClassName()}>{labels.start}</Link>}
          {prefill && !match?.session && !item.omitted && <Link to={routes.newManualWorkout} state={{ weekEntry: prefill }} className={getButtonClassName({ variant: 'secondary' })}>Wpisz trening po zajęciach</Link>}
          {item.kind !== 'rest' && <button type="button" disabled={busy} className={getButtonClassName({ variant: 'ghost' })} onClick={() => setEditing({ day: item.day, initial: item })}>{labels.edit}</button>}
          <button type="button" disabled={busy} className={getButtonClassName({ variant: 'ghost' })} onClick={() => setEditing({ day: item.day })}>{labels.addShort}</button>
          {item.kind !== 'rest' && <button type="button" disabled={busy} className={getButtonClassName({ variant: 'ghost' })} onClick={() => { void toggleOmitted(item); setOptions(null) }}>{item.omitted ? labels.restore : labels.omit}</button>}
          <button type="button" disabled={busy} className={getButtonClassName({ variant: 'ghost' })} onClick={() => { void save(plan.schedule!.filter((entry) => entry.id !== item.id), Math.max(0, (plan.targetCount ?? 0) - (item.kind === 'rest' ? 0 : 1))) }}>{labels.removeFromWeek}</button>
        </div>
        <label className="block space-y-1">{labels.move}<select aria-label={labels.move} className="block min-h-touch border border-bd bg-input px-2 text-base text-ink" value={item.day ?? ''} disabled={busy} onChange={(event) => {
          const day = weekdays.find(({ day }) => String(day) === event.target.value)?.day
          if (day !== undefined) { void move(item, day); setOptions(null) }
        }}>{item.day === null && <option value="">{labels.anyDay}</option>}{weekdays.map(({ day, name }) => <option key={day} value={day}>{name}</option>)}</select></label>
        {item.kind === 'own' && item.workoutPlanId && plans.status === 'ready' && plans.complete && !availablePlans.some((plan) => plan.id === item.workoutPlanId) && <p>{weekPlanLabels.unavailable}</p>}
      </div>}
    </div>
  }
  return <div className="flex flex-col gap-2.5 px-4 pb-6 pt-14 md:px-0 md:pt-0">
    <header className="-ml-3 flex items-center gap-1"><Link to={routes.progress} aria-label={labels.backProgress} className="flex size-11 shrink-0 items-center justify-center"><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25"><path d="m15 18-6-6 6-6" /></svg></Link>
    <h1 className="font-display text-[28px] font-extrabold">{weekPlanLabels.title}</h1></header>
    {selected.status !== 'ready' && <WeekPlanDataMessage status={selected.status} />}
    <button type="button" className="flex min-h-touch items-center gap-3 rounded-[2px] border border-bd bg-surface p-3.5 text-left" onClick={onRecurring}>
      <span className="accent-icon"><svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-5v2a3 3 0 0 1-3 3H3" /></svg></span>
      <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold">{labels.recurring}</span><span className="block text-[13px] text-muted">{recurringSummary(recurring)}</span></span><span aria-hidden="true">›</span>
    </button>
    <nav aria-label={weekPlanLabels.title} className="flex items-center gap-2">
      {weekStart > weekPlans.rangeStart ? <Link aria-label={weekPlanLabels.previous} to={routes.weekPlan(shiftCalendarDate(weekStart, -7))} className="flex size-11 items-center justify-center rounded-[2px] border border-bd bg-surface text-lg">‹</Link> : <span />}
      <p className="min-w-0 flex-1 text-center text-[15px] font-semibold">{scheduledWeekLabel(weekStart)}{weekStart === currentWeek && <span className="text-[13px] font-normal text-muted"> · {labels.thisWeek}</span>}</p>
      {weekStart !== currentWeek && <Link to={routes.weekPlan(currentWeek)} aria-label={labels.returnCurrent} className="inline-flex min-h-touch shrink-0 items-center gap-1 rounded-sm border border-crimson-ink px-2 text-sm font-semibold text-crimson-ink"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="1" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>{labels.returnToday}</Link>}
      <Link aria-label={weekPlanLabels.next} to={routes.weekPlan(shiftCalendarDate(weekStart, 7))} className="flex size-11 items-center justify-center rounded-[2px] border border-bd bg-surface text-lg">›</Link>
    </nav>
    {!recurringReady && <div role={recurringWeeks.status === 'error' || recurringWeeks.invalidDocumentIds.length ? 'alert' : 'status'} className="space-y-2 text-sm text-muted">
      <p>{recurringWeeks.status === 'loading' ? weekPlanLabels.loading : recurringWeeks.status === 'error' || recurringWeeks.invalidDocumentIds.length ? labels.failed : labels.incomplete}</p>
      <button type="button" className={getButtonClassName({ variant: 'secondary' })} onClick={retryRecurringWeeks}>{weekPlanLabels.retry}</button>
    </div>}
    {(error || generationError) && <p role="alert" className="text-sm text-crimson-ink">{error ?? weekPlanLabels.failed}</p>}
    {(weekPlans.hasPendingWrites || recurringWeeks.hasPendingWrites) && <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p>}
    {plan.editedAfterWeekEnd && <p className="text-xs text-muted">{weekPlanLabels.historical}</p>}
    {!sessionsReady && <div role="status" className="space-y-2 text-sm text-muted"><p>{weekPlanLabels.sessionsUnavailable}</p><button type="button" className={getButtonClassName({ variant: 'secondary' })} onClick={retrySessions}>{weekPlanLabels.retrySessions}</button></div>}
    {progress && selected.status === 'ready' && <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-[15px]"><span className="font-bold">{labels.goalProgress(progress.goalCount, plan.targetCount ?? 0)}</span><span className="text-[13px] text-muted">{labels.remaining(Math.max(0, (plan.targetCount ?? 0) - progress.goalCount))}</span></div>
      {!!plan.targetCount && <div role="progressbar" aria-label={labels.goal} aria-valuemin={0} aria-valuemax={plan.targetCount} aria-valuenow={Math.min(progress.goalCount, plan.targetCount)} aria-valuetext={labels.goalProgress(progress.goalCount, plan.targetCount)} className="h-1.5 overflow-hidden rounded-[3px] bg-bd"><div className="accent-fill h-full" style={{ width: `${progress.percentage}%` }} /></div>}
    </div>}
    {undo && <div role="status" className="flex flex-wrap items-center gap-2 border border-bd p-3 text-sm"><p>{labels.moved}</p><button type="button" disabled={busy} className={getButtonClassName({ variant: 'secondary' })} onClick={() => { void undoMove() }}>{labels.undo}</button></div>}
    {selected.status === 'ready' && <WeekScheduleList items={plan.schedule!} weekStart={weekStart} today={today} disabled={!canEdit || busy} onAdd={(day) => setEditing({ day })} renderEntry={entry} />}
    {progress && !!progress.extra.length && <section aria-label={labels.extra} className="space-y-2"><h2 className="text-sm font-semibold">{labels.extra}</h2>{progress.extra.map((session) => <p key={session.id} className="text-sm text-muted">{session.workoutDate} · {workoutSessionName(session)}</p>)}</section>}
    <WeekSummaryDisclosure weekStart={weekStart} />
    {editing && <WeekActivitySheet {...editing} weekStart={weekStart} recurring={false} plans={availablePlans} onSave={saveEntry} onClose={() => setEditing(null)} />}
  </div>
}

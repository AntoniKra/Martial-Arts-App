import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { calculateScheduledWeek, generateScheduledWeek } from '@/domain/week-plan/scheduledWeek'
import { clubWorkoutPrefill } from '@/domain/week-plan/clubWorkoutPrefill'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import type { ScheduledWeekItem, WeekActivity, Weekday } from '@/domain/week-plan/weekPlan.types'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { useProfileToday } from '@/features/profile/useProfileToday'
import { workoutSessionName } from '@/features/workouts/utils/workoutSessionPresentation'
import { WeeklySummary } from '@/features/weekly-summary/WeeklySummary'
import { WeekActivityForm } from './WeekActivityForm'
import { WeekPlanEditor } from './WeekPlanEditor'
import { WeekPlanProgress } from './WeekPlanSummary'
import { activityDetail, activityTitle, recurringSummary, scheduleLabels as labels, scheduledWeekLabel, weekdays } from './scheduleLabels'
import { categoryLabel, weekPlanLabels } from './weekPlanLabels'
import { useScheduledWeekActions } from './useScheduledWeekActions'

function GoalEditor({ count, onSave }: { count: number; onSave: (count: number) => Promise<void> }) {
  const [value, setValue] = useState(String(count))
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  return <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
    event.preventDefault()
    if (!/^\d+$/.test(value) || Number(value) > 14) { setError(true); return }
    setError(false); setBusy(true)
    void onSave(Number(value)).finally(() => setBusy(false))
  }}>
    <label className="space-y-1 text-sm text-muted">{labels.goal}<input type="text" inputMode="numeric" value={value} className="block min-h-touch w-20 border border-bd bg-input px-3 text-base text-ink" onChange={(event) => setValue(event.target.value)} /></label>
    <button type="submit" disabled={busy} className={getButtonClassName({ variant: 'secondary', disabled: busy })}>{labels.goalSave}</button>
    {error && <p role="alert" className="w-full text-sm text-crimson-ink">{labels.invalidGoal}</p>}
  </form>
}

export function ScheduledWeekView({ weekStart, onRecurring }: { weekStart: string; onRecurring: () => void }) {
  const { weekPlans, recurringWeeks, weekPlanRepository, retryRecurringWeeks, plans, sessions, currentWeek, retrySessions } = useWorkoutData()
  const stored = weekPlans.items.find((plan) => plan.weekStart === weekStart)
  const recurring = recurringWeeks.items[0]
  const [openedAt] = useState(() => new Date())
  const empty = generateScheduledWeek(weekStart, recurring, openedAt)
  const plan = stored ?? empty
  const [adding, setAdding] = useState<{ day: Weekday | null } | null>(null)
  const [legacyEditing, setLegacyEditing] = useState(false)
  const [generationError, setGenerationError] = useState(false)
  const generation = useRef(false)
  const today = useProfileToday()
  const recurringReady = recurringWeeks.status === 'ready' && !recurringWeeks.invalidDocumentIds.length && (!!recurring || recurringWeeks.complete)
  const canEdit = !!stored || recurringReady
  const { busy, error, saved, undo, save, move, toggleOmitted, undoMove } = useScheduledWeekActions(plan, canEdit)
  const sessionsReady = sessions.status === 'ready' && sessions.complete && !sessions.invalidDocumentIds.length
  const progress = sessionsReady ? calculateScheduledWeek(plan, sessions.items, today) : null
  const availablePlans = plans.status === 'ready' && plans.complete && !plans.invalidDocumentIds.length ? plans.items : []

  useEffect(() => {
    if (stored || !recurring || !recurringReady || generation.current) return
    generation.current = true
    void weekPlanRepository.save(generateScheduledWeek(weekStart, recurring, openedAt)).catch(() => setGenerationError(true))
  }, [stored, recurring, recurringReady, weekPlanRepository, weekStart, openedAt])

  async function add(items: WeekActivity[]) {
    const schedule = [...(plan.schedule ?? []), ...items.map((item) => ({ ...item, omitted: false }))]
    const target = (plan.targetCount ?? 0) + items.filter((item) => item.kind !== 'rest').length
    if (!await save(schedule, Math.min(14, target))) throw new Error('Week save failed')
    setAdding(null)
  }
  function entry(item: ScheduledWeekItem) {
    const match = progress?.matches.find((match) => match.item.id === item.id)
    const launchable = item.kind === 'own' && item.workoutPlanId !== null && availablePlans.some((plan) => plan.id === item.workoutPlanId)
    const prefill = clubWorkoutPrefill(weekStart, item, today)
    return <div key={item.id} className="min-w-0 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0"><p className="break-words text-[15px] font-semibold">{activityTitle(item)}</p>{item.kind !== 'rest' && <p className="mt-0.5 break-words text-xs text-muted">{activityDetail(item)}</p>}</div>
        {match && item.kind !== 'rest' && <p className="text-xs font-semibold text-muted">{labels.statuses[match.status]}{match.session?.status === 'partial' ? ` ${labels.partial}` : ''}</p>}
        {launchable && item.kind === 'own' && item.workoutPlanId && <Link to={routes.workoutActive(item.workoutPlanId)} className={getButtonClassName()}>{labels.start}</Link>}
        {prefill && !match?.session && !item.omitted && <Link to={routes.newManualWorkout} state={{ weekEntry: prefill }} className={getButtonClassName({ variant: 'secondary' })}>{labels.entry}</Link>}
        {item.kind === 'own' && item.workoutPlanId && plans.status === 'ready' && plans.complete && !availablePlans.some((plan) => plan.id === item.workoutPlanId) && <p className="text-xs text-muted">{weekPlanLabels.unavailable}</p>}
      </div>
      <details className="mt-1 text-xs text-muted"><summary className="flex min-h-touch cursor-pointer items-center">{labels.options}</summary>
        <div className="flex flex-wrap gap-2">
          <label className="block space-y-1">{labels.move}<select aria-label={labels.move} className="block min-h-touch border border-bd bg-input px-2 text-base text-ink" value={item.day ?? ''} disabled={busy} onChange={(event) => {
            const day = weekdays.find(({ day }) => String(day) === event.target.value)?.day
            if (day !== undefined) void move(item, day)
          }}>{item.day === null && <option value="">{labels.anyDay}</option>}{weekdays.map(({ day, name }) => <option key={day} value={day}>{name}</option>)}</select></label>
          {item.kind !== 'rest' && <button type="button" disabled={busy} className={getButtonClassName({ variant: 'ghost' })} onClick={() => { void toggleOmitted(item) }}>{item.omitted ? labels.restore : labels.omit}</button>}
          <button type="button" disabled={busy} className={getButtonClassName({ variant: 'ghost' })} onClick={() => { void save((plan.schedule ?? []).filter((entry) => entry.id !== item.id)) }}>{labels.remove}</button>
        </div>
      </details>
    </div>
  }
  return <div className="flex flex-col gap-3.5 px-4 pb-6 pt-7 md:px-0">
    <Link to={routes.progress} className="flex min-h-touch items-center text-[13px] text-muted">{labels.backProgress}</Link>
    <h1 className="font-display text-[28px] font-extrabold">{weekPlanLabels.title}</h1>
    <button type="button" className="min-h-touch border border-bd bg-surface px-3 py-2 text-left text-[13px] font-semibold" onClick={onRecurring}>{recurringSummary(recurring)}</button>
    <nav aria-label={weekPlanLabels.title} className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
      {weekStart > weekPlans.rangeStart ? <Link aria-label={weekPlanLabels.previous} to={routes.weekPlan(shiftCalendarDate(weekStart, -7))} className="flex min-h-touch items-center justify-center border border-bd bg-surface text-lg">‹</Link> : <span />}
      <p className="text-center text-[15px] font-semibold">{scheduledWeekLabel(weekStart)}{weekStart === currentWeek && <span className="text-sm font-medium text-muted"> · {labels.thisWeek}</span>}</p>
      <Link aria-label={weekPlanLabels.next} to={routes.weekPlan(shiftCalendarDate(weekStart, 7))} className="flex min-h-touch items-center justify-center border border-bd bg-surface text-lg">›</Link>
    </nav>
    {weekStart !== currentWeek && <Link to={routes.weekPlan(currentWeek)} className={getButtonClassName({ variant: 'ghost' })}>{weekPlanLabels.current}</Link>}
    {!recurringReady && <div role={recurringWeeks.status === 'error' || recurringWeeks.invalidDocumentIds.length ? 'alert' : 'status'} className="space-y-2 text-sm text-muted">
      <p>{recurringWeeks.status === 'loading' ? weekPlanLabels.loading : recurringWeeks.status === 'error' || recurringWeeks.invalidDocumentIds.length ? labels.failed : labels.incomplete}</p>
      <button type="button" className={getButtonClassName({ variant: 'secondary' })} onClick={retryRecurringWeeks}>{weekPlanLabels.retry}</button>
    </div>}
    {(error || generationError) && <p role="alert" className="text-sm text-crimson-ink">{error ?? weekPlanLabels.failed}</p>}
    {(weekPlans.hasPendingWrites || recurringWeeks.hasPendingWrites) && <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p>}
    {saved && <p role="status" className="text-sm text-muted">{labels.saved}</p>}
    {plan.editedAfterWeekEnd && <p className="text-xs text-muted">{weekPlanLabels.historical}</p>}
    {!sessionsReady && <div role="status" className="space-y-2 text-sm text-muted"><p>{weekPlanLabels.sessionsUnavailable}</p><button type="button" className={getButtonClassName({ variant: 'secondary' })} onClick={retrySessions}>{weekPlanLabels.retrySessions}</button></div>}
    {progress && plan.targetCount ? <div className="space-y-1.5">
      <p className="font-display text-lg font-bold">{labels.goalProgress(progress.workoutCount, plan.targetCount)} <span className="font-sans text-[13px] font-medium text-muted">· {labels.remaining(Math.max(0, plan.targetCount - progress.workoutCount))}</span></p>
      <div role="progressbar" aria-label={labels.goal} aria-valuemin={0} aria-valuemax={plan.targetCount} aria-valuenow={Math.min(progress.workoutCount, plan.targetCount)} aria-valuetext={labels.goalProgress(progress.workoutCount, plan.targetCount)} className="h-1.5 bg-elevated"><div className="h-full bg-crimson" style={{ width: `${progress.percentage}%` }} /></div>
    </div> : !stored ? <WeekPlanProgress weekStart={weekStart} /> : progress && <p className="text-sm text-muted">{labels.workoutCount(progress.workoutCount)}</p>}
    {undo && <div role="status" className="flex flex-wrap items-center gap-2 border border-bd p-3 text-sm"><p>{labels.moved}</p><button type="button" disabled={busy} className={getButtonClassName({ variant: 'secondary' })} onClick={() => { void undoMove() }}>{labels.undo}</button></div>}
    {legacyEditing ? <WeekPlanEditor weekStart={weekStart} initial={undefined} onClose={() => setLegacyEditing(false)} /> : <>
      <ol aria-label={labels.list} className="divide-y divide-bd border border-bd bg-surface">{weekdays.map(({ day, short, name }) => {
        const date = shiftCalendarDate(weekStart, day)
        const items = plan.schedule?.filter((item) => item.day === day) ?? []
        return <li key={day} aria-label={`${name} ${date}`} className={`grid grid-cols-[52px_1fr] ${date === today ? 'border-l-[3px] border-l-crimson bg-elevated' : ''}`}>
          <div className={`py-3 pl-3 text-xs font-semibold ${date === today ? 'text-crimson-ink' : 'text-muted'}`}>{short.toUpperCase()}<br /><span className="text-[15px] text-ink">{Number(date.slice(-2))}</span>{date === today && <><br /><span className="text-[10px]">{labels.today}</span></>}</div>
          <div className="min-w-0">{items.map(entry)}{!items.length && <div className="px-3 py-1.5"><button type="button" disabled={!canEdit || busy} className="min-h-touch border border-dashed border-bd px-3.5 text-[13px] font-semibold text-muted" onClick={() => setAdding({ day })}>{labels.add}</button></div>}</div>
        </li>
      })}</ol>
      <section aria-label={labels.anyDay} className="flex flex-col gap-2.5 border border-bd bg-surface px-3 py-3.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{labels.anyDay}</h2><p className="text-xs text-faint">{labels.anyHint}</p>
        {plan.schedule?.filter((item) => item.day === null).map(entry)}
        <button type="button" disabled={!canEdit || busy} className={getButtonClassName({ variant: 'ghost' })} onClick={() => setAdding({ day: null })}>{labels.add}</button>
      </section>
      {adding && <WeekActivityForm key={String(adding.day)} defaultDay={adding.day} recurring={false} plans={availablePlans} onSave={add} onCancel={() => setAdding(null)} />}
      {progress && !!progress.types.length && <section aria-label={labels.types} className="space-y-2"><h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{labels.types}</h2><div className="flex flex-wrap gap-1.5">{progress.types.map((type) => <p key={type.category} className="border border-bd px-2.5 py-2 text-[13px] text-muted">{categoryLabel(type.category)} {type.completed >= type.planned ? '✓ ' : ''}{type.completed}/{type.planned}</p>)}</div></section>}
      {progress && !!progress.extra.length && <section aria-label={labels.extra} className="space-y-2"><h2 className="text-sm font-semibold">{labels.extra}</h2>{progress.extra.map((session) => <p key={session.id} className="text-sm text-muted">{session.workoutDate} · {workoutSessionName(session)}</p>)}</section>}
      {canEdit && <GoalEditor key={plan.targetCount} count={plan.targetCount ?? 0} onSave={async (count) => { await save(plan.schedule ?? [], count) }} />}
      {!stored && !plan.schedule?.length && <button type="button" className={getButtonClassName({ variant: 'secondary' })} onClick={() => setLegacyEditing(true)}>{weekPlanLabels.arrange}</button>}
      <p className="text-xs text-faint">{labels.oneWeekHint}</p>
    </>}
    <WeeklySummary weekStart={weekStart} />
  </div>
}

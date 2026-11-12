import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { routes } from '@/app/routes'
import { useWorkoutData } from '@/application/workoutDataContext'
import { selectWeekPlan } from '@/application/week-plan/selectWeekPlan'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { isMonday, shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import { calculateWeekPlanProgress } from '@/domain/week-plan/weekPlanProgress'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { WeekPlanDataMessage, WeekPlanProgress } from '@/features/week-plan/WeekPlanSummary'
import { WeekPlanEditor } from '@/features/week-plan/WeekPlanEditor'
import { WeeklySummary } from '@/features/weekly-summary/WeeklySummary'
import { weekPlanLabels as labels, weekItemLabel, weekLabel } from '@/features/week-plan/weekPlanLabels'

function WeekDetails({ weekStart }: { weekStart: string }) {
  const { weekPlans, sessions, plans } = useWorkoutData()
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const selected = selectWeekPlan(weekPlans, weekStart)
  const progress = selected.status === 'ready' && sessions.status === 'ready' && sessions.complete && !sessions.invalidDocumentIds.length
    ? calculateWeekPlanProgress(weekStart, selected.plan, sessions.items) : null
  return <>
    <WeekPlanProgress weekStart={weekStart} />
    {weekPlans.pendingIds.has(weekStart) && <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p>}
    {selected.status === 'ready' && selected.plan?.editedAfterWeekEnd && <p className="text-sm text-muted">{labels.historical}</p>}
    {saved && selected.status === 'ready' && <p role="status" className="text-sm text-muted">{labels.saved}</p>}
    <WeeklySummary weekStart={weekStart} />
    {editing ? <WeekPlanEditor weekStart={weekStart} initial={selected.status === 'ready' ? selected.plan : undefined} onClose={(didSave) => { setEditing(false); setSaved(didSave) }} /> : <>
      {selected.status === 'ready' && <>
        <ul aria-label="Pozycje planu tygodnia" className="space-y-3">{selected.plan?.items.map((item) => {
          const match = progress?.matches.find((entry) => entry.item.id === item.id)
          const unavailable = item.kind === 'plan' && plans.status === 'ready' && plans.complete && !plans.invalidDocumentIds.length && !plans.items.some((plan) => plan.id === item.workoutPlanId)
          return <li key={item.id} className="space-y-1 border border-bd bg-surface p-4">
            <p className="break-words font-display font-semibold">{weekItemLabel(item)}</p>
            {unavailable && <p className="text-sm text-muted">{labels.unavailable}</p>}
            {progress && <p className="text-sm text-muted">{match?.session ? match.session.status === 'completed' ? labels.completed : labels.partial : labels.unfulfilled}</p>}
          </li>
        })}</ul>
        <button type="button" className={getButtonClassName()} onClick={() => { setEditing(true); setSaved(false) }}>{selected.plan?.items.length ? labels.edit : labels.arrange}</button>
      </>}
    </>}
  </>
}

export function Component() {
  const { currentWeek, weekPlans } = useWorkoutData()
  const { weekStart = '' } = useParams()
  const navigate = useNavigate()
  const selected = selectWeekPlan(weekPlans, weekStart)
  if (!isMonday(weekStart) || selected.status === 'outsideRange') return <div className="space-y-4 px-4 py-6 md:px-0">
    <h1 className="font-display text-3xl font-bold">{labels.title}</h1>
    <WeekPlanDataMessage status="outsideRange" />
    <Link to={routes.weekPlan(currentWeek)} className={getButtonClassName()}>{labels.current}</Link>
  </div>
  const options = [...new Set([...Array.from({ length: 14 }, (_, index) => shiftCalendarDate(currentWeek, (index - 12) * 7)),
    ...weekPlans.items.map((plan) => plan.weekStart), weekStart])].filter((week) => week >= weekPlans.rangeStart).sort()
  return <div className="space-y-5 px-4 py-6 md:px-0">
    <Link to={routes.progress} className={getButtonClassName({ variant: 'ghost' })}>Wróć do Postępu</Link>
    <h1 className="font-display text-3xl font-bold">{labels.title}</h1>
    <nav aria-label="Wybór tygodnia" className="space-y-3">
      <label className="block space-y-2 text-sm">Tydzień<select aria-label="Tydzień" value={weekStart} onChange={(event) => void navigate(routes.weekPlan(event.target.value))} className="min-h-touch w-full border border-bd bg-surface px-3 text-base text-ink">
        {options.map((week) => <option key={week} value={week}>{weekLabel(week)}{week === currentWeek ? ' · bieżący' : ''}</option>)}
      </select></label>
      <div className="flex flex-wrap gap-2">
        {weekStart > weekPlans.rangeStart && <Link to={routes.weekPlan(shiftCalendarDate(weekStart, -7))} className={getButtonClassName({ variant: 'secondary' })}>{labels.previous}</Link>}
        <Link to={routes.weekPlan(shiftCalendarDate(weekStart, 7))} className={getButtonClassName({ variant: 'secondary' })}>{labels.next}</Link>
        {weekStart !== currentWeek && <Link to={routes.weekPlan(currentWeek)} className={getButtonClassName({ variant: 'ghost' })}>{labels.current}</Link>}
      </div>
    </nav>
    <WeekDetails key={weekStart} weekStart={weekStart} />
  </div>
}

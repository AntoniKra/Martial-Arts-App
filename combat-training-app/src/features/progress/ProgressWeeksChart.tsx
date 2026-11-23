import { routes } from '@/app/routes'
import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWorkoutData } from '@/application/workoutDataContext'
import { selectWeekPlan } from '@/application/week-plan/selectWeekPlan'
import { calculateWeeklySummary } from '@/domain/weekly-summary/weeklySummary'
import { progressWeeks, weekTarget } from '@/domain/weekly-summary/progressOverview'
import { historyRange } from '@/features/workouts/utils/historyWeeks'
import { progressLabels as labels } from './progressLabels'

const defaultWeekCount = 5
const weekHistoryPath = (week: string) => `${routes.progressHistory}&week=${week}`

export function ProgressWeeksChart() {
  const { sessions, weekPlans, currentWeek } = useWorkoutData()
  const [expanded, setExpanded] = useState(false)
  const [interacted, setInteracted] = useState(false)
  const chartId = useId()
  const weeks = progressWeeks(sessions.items, currentWeek)
  if (weeks.length < 3) return <p className="text-sm text-muted">{labels.chartHint}</p>
  const series = weeks.map((week) => {
    const selected = selectWeekPlan(weekPlans, week)
    return { week, count: calculateWeeklySummary(week, sessions.items).workoutCount,
      target: selected.status === 'ready' ? weekTarget(selected.plan) : null,
      planKnown: selected.status === 'ready' }
  })
  const canExpand = series.length > defaultWeekCount
  const showExpanded = expanded && canExpand
  const visible = showExpanded ? series : series.slice(-defaultWeekCount)
  const max = Math.max(1, ...visible.flatMap((item) => [item.count, item.target ?? 0]))
  const describe = (item: typeof series[number]) => labels.weekDetails(item.week, item.count, item.target, item.planKnown)

  return <section aria-label={labels.recentWeeks} className="min-w-0 space-y-3">
    <div><h2 className="font-display text-lg font-bold">{labels.recentWeeks}</h2><p className="text-sm text-muted">{labels.chartMetric.toLocaleLowerCase('pl-PL')}</p></div>
    <div id={chartId} className={`progress-weeks-chart ${showExpanded ? 'is-expanded' : ''} ${interacted ? 'has-toggled' : ''}`} role="group"
      aria-label={`${labels.chartMetric}. ${visible.map(describe).join('; ')}`}>
      {series.map((item, index) => {
        const older = index < series.length - defaultWeekCount
        const isCurrent = item.week === currentWeek
        return <div key={item.week}
          className={`progress-week-column relative ${older ? 'is-older' : 'is-recent'} ${!showExpanded && older ? 'is-hidden' : ''} ${isCurrent ? 'is-current' : ''} ${item.target !== null && item.count < item.target ? 'is-below' : ''}`}>
          <span aria-hidden="true" className="h-5 text-xs font-bold tabular-nums">{item.count}{!showExpanded && item.target !== null ? `/${item.target}` : ''}</span>
          <span aria-hidden="true" className="progress-week-track">
            <span className="progress-week-bar" style={{ transform: `scaleY(${Math.max(item.count ? 0 : 0.01, item.count / max)})` }} />
            {item.target !== null && <span className="progress-week-target" style={{ transform: `translateY(${-item.target / max * 120}px)` }} />}
          </span>
          <span aria-hidden="true" className="progress-week-date">{isCurrent ? (showExpanded ? labels.currentWeekCompact : labels.currentWeekShort) : `${Number(item.week.slice(8))}.${Number(item.week.slice(5, 7))}`}</span>
          {!showExpanded && !older && <Link to={weekHistoryPath(item.week)} aria-label={`${labels.chartMetric} ${describe(item)}`} className="absolute inset-0" />}
        </div>
      })}
    </div>
    {showExpanded && <div className="space-y-1">
      <p className="text-xs text-muted">{labels.weekPicker}</p>
      <ul role="list" aria-label={labels.weekPicker} className="flex snap-x gap-2 overflow-x-auto p-1">
        {visible.map((item) => {
          const range = historyRange(item.week)
          return <li key={item.week} className="shrink-0 snap-start">
            <Link to={weekHistoryPath(item.week)} aria-label={`${range} · ${describe(item)}`}
              className="flex min-h-touch min-w-touch items-center justify-center whitespace-nowrap border border-bd bg-surface px-2 text-xs font-semibold text-ink hover:bg-elevated">
              {range}
            </Link>
          </li>
        })}
      </ul>
    </div>}
    {series.some((item) => !item.planKnown) && <p className="text-xs text-muted">{labels.chartPlanUnavailable}</p>}
    {canExpand && <button type="button" aria-expanded={showExpanded} aria-controls={chartId} onClick={() => { setInteracted(true); setExpanded(!showExpanded) }} className="mx-auto block min-h-touch border border-bd px-4 text-sm font-semibold">{showExpanded ? labels.showFewerWeeks : labels.showMoreWeeks(series.length)}</button>}
    <p aria-live="polite" aria-atomic="true" className="sr-only">{interacted ? labels.weeksShown(visible.length) : ''}</p>
  </section>
}

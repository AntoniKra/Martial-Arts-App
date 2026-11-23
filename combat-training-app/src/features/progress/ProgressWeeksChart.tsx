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
const trackHeight = 100
const weekHistoryPath = (week: string) => `${routes.progressHistory}&week=${week}`

export function ProgressWeeksChart() {
  const { sessions, weekPlans, currentWeek } = useWorkoutData()
  const [expanded, setExpanded] = useState(false)
  const [interacted, setInteracted] = useState(false)
  const chartId = useId()
  const weeks = progressWeeks(sessions.items, currentWeek)
  if (weeks.length < 3) return <section aria-label={labels.recentWeeks}
    className="flex flex-col items-center gap-2 rounded-sm border border-dashed border-bd bg-surface px-4 py-6 text-center">
    <svg aria-hidden="true" className="mb-0.5 size-7 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18M7 16l4-5 4 3 6-8" />
    </svg>
    <h2 className="font-display text-sm font-bold">{labels.recentWeeks}</h2>
    <p className="max-w-[260px] text-[12.5px] leading-[1.4] text-muted">{labels.chartHint}</p>
  </section>
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

  return <section aria-label={labels.recentWeeks} className="flex min-w-0 flex-col gap-3 rounded-sm border border-bd bg-surface px-3.5 pt-3.5 pb-3">
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="font-display text-[15px] font-extrabold">{labels.recentWeeks}</h2>
      <p className="text-right text-[11.5px] text-muted">{labels.chartMetric.toLocaleLowerCase('pl-PL')}</p>
    </div>
    <div id={chartId} className={`progress-weeks-chart ${showExpanded ? 'is-expanded' : ''} ${interacted ? 'has-toggled' : ''}`} role="group"
      aria-label={`${labels.chartMetric}. ${visible.map(describe).join('; ')}`}>
      {series.map((item, index) => {
        const older = index < series.length - defaultWeekCount
        const isCurrent = item.week === currentWeek
        return <div key={item.week}
          className={`progress-week-column ${older ? 'is-older' : 'is-recent'} ${!showExpanded && older ? 'is-hidden' : ''} ${isCurrent ? 'is-current' : ''}`}>
          <span aria-hidden="true" className="mb-1 font-display text-[11.5px] font-bold tabular-nums">
            {item.count}{!showExpanded && item.target !== null && <span className="text-[10px] text-muted">/{item.target}</span>}
          </span>
          <span aria-hidden="true" className="progress-week-track" style={{ height: trackHeight }}>
            <span className="progress-week-bar" style={{ transform: `scaleY(${Math.max(item.count ? 0 : 0.01, item.count / max)})` }} />
            {item.target !== null && <span className="progress-week-target" style={{ transform: `translateY(${-item.target / max * trackHeight}px)` }} />}
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
    {canExpand && <button type="button" aria-expanded={showExpanded} aria-controls={chartId} onClick={() => { setInteracted(true); setExpanded(!showExpanded) }}
      className="mt-1 min-h-touch self-center rounded-sm border border-bd px-3.5 py-2 text-[12.5px] font-semibold hover:bg-elevated">
      {showExpanded ? labels.showFewerWeeks : labels.showMoreWeeks(series.length)}
    </button>}
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{interacted ? labels.weeksShown(visible.length) : ''}</p>
  </section>
}

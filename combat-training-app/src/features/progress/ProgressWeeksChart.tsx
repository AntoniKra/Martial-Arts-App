import { routes } from '@/app/routes'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWorkoutData } from '@/application/workoutDataContext'
import { selectWeekPlan } from '@/application/week-plan/selectWeekPlan'
import { calculateWeeklySummary } from '@/domain/weekly-summary/weeklySummary'
import { progressWeeks, weekTarget } from '@/domain/weekly-summary/progressOverview'
import { progressLabels as labels } from './progressLabels'

export function ProgressWeeksChart() {
  const { sessions, weekPlans, currentWeek } = useWorkoutData()
  const [expanded, setExpanded] = useState(false)
  const [interacted, setInteracted] = useState(false)
  const weeks = progressWeeks(sessions.items, currentWeek)
  if (weeks.length < 3) return <p className="text-sm text-muted">Wykres pojawi się po 3 tygodniach</p>
  const series = weeks.map((week) => {
    const selected = selectWeekPlan(weekPlans, week)
    return { week, count: calculateWeeklySummary(week, sessions.items).workoutCount,
      target: selected.status === 'ready' ? weekTarget(selected.plan) : null,
      planKnown: selected.status === 'ready' }
  })
  const visible = expanded ? series : series.slice(-5)
  const max = Math.max(1, ...visible.flatMap((item) => [item.count, item.target ?? 0]))
  return <section aria-label="Ostatnie tygodnie" className="space-y-3">
    <div><h2 className="font-display text-lg font-bold">Ostatnie tygodnie</h2><p className="text-sm text-muted">treningi w tygodniu</p></div>
    <div className={`progress-weeks-chart ${expanded ? 'is-expanded' : ''} ${interacted ? 'has-toggled' : ''}`} role="group"
      aria-label={`Treningi w tygodniu. ${visible.map((item) => `${item.week}: ${item.count}${item.target === null ? '' : `, plan ${item.target}`}${item.planKnown ? '' : ', plan niedostępny'}`).join('; ')}`}>
      {series.map((item, index) => <Link key={item.week} to={`${routes.progressHistory}&week=${item.week}`}
        aria-hidden={!expanded && index < series.length - 5} tabIndex={!expanded && index < series.length - 5 ? -1 : undefined}
        className={`progress-week-column ${index < series.length - 5 ? 'is-older' : 'is-recent'} ${!expanded && index < series.length - 5 ? 'is-hidden' : ''} ${item.week === currentWeek ? 'is-current' : ''} ${item.target !== null && item.count < item.target ? 'is-below' : ''}`}>
        <span className="h-5 text-xs font-bold tabular-nums">{item.count}{!expanded && item.target !== null ? `/${item.target}` : ''}</span>
        <span className="progress-week-track">
          <span className="progress-week-bar" style={{ transform: `scaleY(${Math.max(item.count ? 0 : 0.01, item.count / max)})` }} />
          {item.target !== null && <span className="progress-week-target" style={{ transform: `translateY(${-item.target / max * 120}px)` }} />}
        </span>
        <span className="progress-week-date">{item.week === currentWeek ? (expanded ? 'ten' : 'ten tydz.') : `${Number(item.week.slice(8))}.${Number(item.week.slice(5, 7))}`}</span>
        <span className="sr-only"> · Treningi w tygodniu {item.week}: {item.count}{item.target === null ? '' : `, plan ${item.target}`}</span>
      </Link>)}
    </div>
    {series.some((item) => !item.planKnown) && <p className="text-xs text-muted">Część planów tygodnia jest niedostępna.</p>}
    <button type="button" aria-expanded={expanded} onClick={() => { setInteracted(true); setExpanded(!expanded) }} className="mx-auto block min-h-touch border border-bd px-4 text-sm font-semibold">{expanded ? labels.showFewerWeeks : labels.showMoreWeeks}</button>
    <p aria-live="polite" aria-atomic="true" className="sr-only">{interacted ? labels.weeksShown(expanded) : ''}</p>
  </section>
}

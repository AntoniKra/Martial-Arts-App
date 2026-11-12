import { useEffect, useRef, useState } from 'react'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import type { WeeklySeriesPoint } from '@/domain/weekly-summary/weeklySeries'
import { weekLabel } from '@/features/week-plan/weekPlanLabels'
import { weeklySummaryLabels as labels } from './weeklySummaryLabels'

function mondayLabel(date: string): string {
  const [, month, day] = date.split('-')
  return `${Number(day)}.${month}`
}

export function WeeklyChart({ weeks }: { weeks: readonly WeeklySeriesPoint[] }) {
  const [metric, setMetric] = useState<'workouts' | 'minutes'>('workouts')
  const ref = useRef<HTMLElement>(null)
  const [width, setWidth] = useState(320)
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))))
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  // Match the summary's rounding after summing, including fractional durations.
  const minutes = weeks.map((week) => Math.ceil(week.durationSeconds / 60))
  const values = metric === 'workouts' ? weeks.map((week) => week.workoutCount) : minutes
  const maximum = Math.max(1, ...values)
  const slot = (width - 36) / weeks.length
  const baseline = 174
  return <section aria-label={labels.chart} ref={ref} className="space-y-3 border-t border-bd pt-4">
    <h3 className="font-display text-lg font-semibold">{labels.chart}</h3>
    <div role="group" aria-label={labels.metric} className="flex gap-2">
      {(['workouts', 'minutes'] as const).map((option) => <button key={option} type="button" aria-pressed={metric === option}
        onClick={() => setMetric(option)} className={getButtonClassName({ variant: metric === option ? 'secondary' : 'ghost', size: 'sm' })}>{labels[option]}</button>)}
    </div>
    <svg width="100%" height="224" viewBox={`0 0 ${width} 224`} role="img" aria-label={labels.chartDescription(labels[metric])} className="block text-ink tabular-nums">
      <line x1="28" x2={width - 8} y1={baseline} y2={baseline} stroke="var(--app-muted)" />
      <line x1="28" x2="28" y1="40" y2={baseline} stroke="var(--app-muted)" />
      <text x="4" y={baseline + 4} fontSize="10" fill="currentColor">0</text>
      <text x="4" y="44" fontSize="10" fill="currentColor">{maximum}</text>
      {weeks.map((week, index) => {
        const x = 28 + slot * (index + 0.5)
        const height = values[index] / maximum * (baseline - 40)
        const selected = index === weeks.length - 1
        return <g key={week.weekStart}>
          {selected && <rect x={x - slot / 2 + 1} y="16" width={slot - 2} height="204" fill="none" stroke="currentColor" />}
          <rect x={x - slot * 0.28} y={baseline - height} width={slot * 0.56} height={height}
            fill={week.isCurrent ? 'none' : 'currentColor'} stroke="currentColor" />
          <text x={x} y={baseline - height - 7} textAnchor="middle" fontSize="10" fill="currentColor">{values[index]}</text>
          {(width >= 480 || index % 2 === 1) && <text x={x} y="195" textAnchor="middle" fontSize="10" fontWeight={selected ? '700' : '400'} fill="currentColor">{mondayLabel(week.weekStart)}</text>}
          {week.isCurrent && <text x={x} y="211" textAnchor="middle" fontSize="9" fill="currentColor">{labels.inProgress}</text>}
        </g>
      })}
    </svg>
    <p className="text-xs text-muted">{labels.chartHint}</p>
    <details>
      <summary className="min-h-touch cursor-pointer py-3 font-display font-semibold">{labels.showData}</summary>
      <table className="w-full text-left text-xs tabular-nums">
        <caption className="sr-only">{labels.chart}</caption>
        <thead><tr><th scope="col" className="py-2">{labels.week}</th><th scope="col">{labels.workouts}</th><th scope="col">{labels.minutes}</th></tr></thead>
        <tbody>{weeks.map((week, index) => <tr key={week.weekStart} className={`border-t border-bd ${index === weeks.length - 1 ? 'font-bold' : ''}`}>
          <th scope="row" className={`py-2 ${index === weeks.length - 1 ? 'font-bold' : 'font-normal'}`}>{weekLabel(week.weekStart)}
            {index === weeks.length - 1 && <span className="block">{labels.selectedWeek}</span>}
            {week.isCurrent && <span className="block">{labels.inProgress}</span>}
          </th><td>{week.workoutCount}</td><td>{minutes[index]}</td>
        </tr>)}</tbody>
      </table>
    </details>
  </section>
}

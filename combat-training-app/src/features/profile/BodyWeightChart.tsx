import type { WeeklyWeightPoint } from '@/domain/profile/bodyWeight'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import { profileLabels as labels, measurementCountLabel, profileDateLabel, profileRangeLabel, weightKgLabel } from './profileLabels'

export function BodyWeightChart({ weeks }: { weeks: readonly WeeklyWeightPoint[] }) {
  const values = weeks.flatMap((week) => week.averageKg === null ? [] : [week.averageKg])
  const minimum = values.length ? Math.min(...values) : 0
  const maximum = values.length ? Math.max(...values) : 0
  const margin = Math.max(0.5, (maximum - minimum) * 0.1)
  const low = minimum - margin, high = maximum + margin
  const point = (index: number, value: number) => ({ x: 54 + index * 26, y: 155 - (value - low) / (high - low) * 130 })
  return <section aria-label={labels.chart} className="space-y-3 border-t border-bd pt-4">
    <h3 className="font-display text-lg font-semibold">{labels.chart}</h3>
    {values.length ? <>
      <svg width="100%" viewBox="0 0 360 210" role="img" aria-label={labels.chartDescription} className="block text-ink tabular-nums">
        <line x1="48" x2="350" y1="155" y2="155" stroke="var(--app-muted)" />
        <line x1="48" x2="48" y1="25" y2="155" stroke="var(--app-muted)" />
        <text x="1" y="29" fontSize="12" fill="currentColor">{weightKgLabel(high)}</text>
        <text x="1" y="159" fontSize="12" fill="currentColor">{weightKgLabel(low)}</text>
        {weeks.map((week, index) => {
          const position = week.averageKg === null ? null : point(index, week.averageKg)
          const previous = weeks[index - 1]
          const previousPosition = previous && previous.averageKg !== null ? point(index - 1, previous.averageKg) : null
          return <g key={week.weekStart}>
            {position && previousPosition && <line x1={previousPosition.x} y1={previousPosition.y} x2={position.x} y2={position.y} stroke="currentColor" strokeWidth="2" />}
            {position && <circle cx={position.x} cy={position.y} r="4" fill="currentColor" />}
            {index % 2 === 1 && <text x={54 + index * 26} y="181" textAnchor="middle" fontSize="11" fill="currentColor">{profileDateLabel(week.weekStart)}</text>}
            {week.isCurrent && <text x={54 + index * 26} y="201" textAnchor="middle" fontSize="11" fill="currentColor">{labels.current}</text>}
          </g>
        })}
      </svg>
      <p className="text-xs text-muted">{labels.chartHint}</p>
    </> : <p className="text-sm text-muted">{labels.noChartWeights}</p>}
    <details>
      <summary className="min-h-touch cursor-pointer py-3 font-display font-semibold">{labels.showData}</summary>
      <table className="w-full text-left text-xs tabular-nums">
        <caption className="sr-only">{labels.chart}</caption>
        <thead><tr><th scope="col" className="py-2">{labels.week}</th><th scope="col">{labels.average}</th><th scope="col">{labels.measurements}</th></tr></thead>
        <tbody>{weeks.map((week) => <tr key={week.weekStart} className="border-t border-bd">
          <th scope="row" className="py-3 pr-2 font-normal">{profileRangeLabel(week.weekStart, shiftCalendarDate(week.weekStart, 6))}
            {week.isCurrent && <span className="block">{labels.current}</span>}</th>
          <td className="pr-2">{week.averageKg === null ? labels.noData : weightKgLabel(week.averageKg)}</td>
          <td>{measurementCountLabel(week.count)}</td>
        </tr>)}</tbody>
      </table>
    </details>
  </section>
}

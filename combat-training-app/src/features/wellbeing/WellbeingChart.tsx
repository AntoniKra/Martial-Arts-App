import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import { wellbeingBaseline, type WellbeingEntry, type WellbeingField } from '@/domain/wellbeing/wellbeing'
import { wellbeingLabels as labels, wellbeingQuestions } from './wellbeingLabels'

export function WellbeingChart({ entries, field, end, version }: { entries: readonly WellbeingEntry[]; field: WellbeingField; end: string; version: number }) {
  const days = Array.from({ length: 28 }, (_, index) => {
    const date = shiftCalendarDate(end, index - 27), entry = entries.find((item) => item.date === date && item.questionsVersion === version)
    return { date, value: entry?.[field] ?? null, norm: wellbeingBaseline(entries, date, version).norms[field] }
  })
  const x = (index: number) => 26 + index * 11, y = (value: number) => 130 - (value - 1) * 27
  return <div className="space-y-2">
    <svg viewBox="0 0 344 168" role="img" aria-label={`${wellbeingQuestions[field].name}: ${labels.chartHint}`} className="block w-full text-ink">
      {[1, 2, 3, 4, 5].map((value) => <g key={value}><text x="4" y={y(value) + 4} fontSize="11" fill="currentColor">{value}</text><line x1="21" x2="333" y1={y(value)} y2={y(value)} stroke="var(--app-border)" /></g>)}
      {days.map((day, index) => <g key={day.date}>
        {day.norm && <rect x={x(index) - 5} y={y(day.norm.p75) - 1} width="11" height={Math.max(2, y(day.norm.p25) - y(day.norm.p75) + 2)} fill="var(--app-muted)" opacity=".28" />}
        {day.value !== null && <circle cx={x(index)} cy={y(day.value)} r="3" fill="currentColor" />}
        {index % 9 === 0 && <text x={x(index)} y="153" textAnchor="middle" fontSize="10" fill="currentColor">{day.date.slice(8)}.{day.date.slice(5, 7)}</text>}
      </g>)}
    </svg>
    <details><summary className="min-h-touch cursor-pointer py-3 text-sm font-semibold">{labels.showData}</summary>
      <table className="w-full text-left text-xs tabular-nums"><caption className="sr-only">{wellbeingQuestions[field].name}: 28 dni</caption>
        <thead><tr><th scope="col">{labels.date}</th><th scope="col">{labels.answer}</th><th scope="col">{labels.band}</th></tr></thead>
        <tbody>{days.map((day) => <tr key={day.date} className="border-t border-bd"><th scope="row" className="py-2 pr-2 font-normal">{day.date}</th>
          <td>{day.value === null ? labels.noData : day.value}</td><td>{day.norm ? `${day.norm.p25}–${day.norm.p75}` : labels.noNorm}</td></tr>)}</tbody>
      </table>
    </details>
  </div>
}

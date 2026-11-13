import type { TypicalWeek } from '@/domain/weekly-summary/typicalWeek'
import type { WeeklySummary } from '@/domain/weekly-summary/weeklySummary'
import { formatActiveDurationSecondsPl } from '@/features/workouts/utils/formatWorkoutSessionLabels'
import { formatComparisonLoadPl, formatTrainingLoadPl, formatTypicalWorkoutCountPl, weeklySummaryLabels as labels } from './weeklySummaryLabels'

export function TypicalWeekComparison({ typical, summary, isCurrent }: {
  typical: TypicalWeek | null; summary: WeeklySummary; isCurrent: boolean
}) {
  if (!typical) return <p className="text-sm text-muted">{labels.comparisonUnavailable}</p>

  const rows = [
    [labels.workouts, String(summary.workoutCount), formatTypicalWorkoutCountPl(typical.workoutCount)],
    [labels.duration, formatActiveDurationSecondsPl(summary.durationSeconds), formatActiveDurationSecondsPl(typical.durationSeconds)],
    [labels.sessionLoad, formatComparisonLoadPl(summary), typical.loadUnits === null ? labels.incompleteLoad : formatTrainingLoadPl(typical.loadUnits)],
  ]
  return <div className="space-y-3 border-t border-bd pt-4">
    <table className="w-full table-fixed text-left text-sm tabular-nums">
      <caption className="pb-3 text-left font-display text-lg font-semibold">{labels.comparison}</caption>
      <thead><tr>
        <th scope="col" className="pb-2 pr-2"><span className="sr-only">{labels.comparisonMetric}</span></th>
        <th scope="col" className="pb-2 pr-2">{isCurrent ? labels.currentWeekOngoing : labels.currentWeek}</th>
        <th scope="col" className="pb-2">{labels.typicalWeek}</th>
      </tr></thead>
      <tbody>{rows.map(([label, current, usual]) => <tr key={label} className="border-t border-bd">
        <th scope="row" className="py-2 pr-2 font-normal text-muted">{label}</th>
        <td className="py-2 pr-2">{current}</td><td className="py-2">{usual}</td>
      </tr>)}</tbody>
    </table>
    <p className="text-xs text-muted">{labels.comparisonHint}</p>
  </div>
}

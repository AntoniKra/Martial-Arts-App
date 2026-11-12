import type { WeeklySessionLoad } from '@/domain/weekly-summary/weeklySummary'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { categoryLabel } from '@/features/week-plan/weekPlanLabels'
import { formatActiveDurationSecondsPl, formatWorkoutSessionDatePl } from '@/features/workouts/utils/formatWorkoutSessionLabels'
import { workoutSessionName } from '@/features/workouts/utils/workoutSessionPresentation'
import { formatTrainingLoadPl, weeklySummaryLabels as labels } from './weeklySummaryLabels'

function sessionLabel(session: WorkoutSession): string {
  return session.source === 'plan' ? workoutSessionName(session) : `${workoutSessionName(session)} · ${categoryLabel(session.category)}`
}

/** `workoutDate` is a calendar day; local noon keeps it on the same day in every timezone. */
function workoutDateLabel(workoutDate: string): string {
  return formatWorkoutSessionDatePl(`${workoutDate}T12:00:00`)
}

export function LoadDetails({ sessionLoads }: { sessionLoads: readonly WeeklySessionLoad[] }) {
  return <details className="border-t border-bd pt-2">
    <summary className="min-h-touch cursor-pointer py-3 font-display font-semibold">{labels.loadDetails}</summary>
    <ul aria-label={labels.loadDetails} className="space-y-3">
      {sessionLoads.map(({ session, load }) => <li key={session.id} className="space-y-2 border border-bd p-3">
        <div>
          <p className="break-words font-semibold">{sessionLabel(session)}</p>
          <p className="text-xs text-muted">{workoutDateLabel(session.workoutDate)}</p>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <div className="min-w-0"><dt className="text-xs text-muted">{labels.duration}</dt><dd className="tabular-nums">{formatActiveDurationSecondsPl(session.durationSeconds)}</dd></div>
          <div className="min-w-0"><dt className="text-xs text-muted">{labels.sessionRpe}</dt><dd className="tabular-nums">{session.rpe ?? labels.noRpe}</dd></div>
          <div className="min-w-0"><dt className="text-xs text-muted">{labels.sessionLoad}</dt><dd className="tabular-nums">{load === null ? labels.noLoad : formatTrainingLoadPl(load)}</dd></div>
        </dl>
      </li>)}
    </ul>
  </details>
}

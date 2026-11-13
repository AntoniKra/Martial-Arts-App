import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { calculateProfileStatistics } from '@/domain/profile/profileStatistics'
import { categoryLabel } from '@/features/week-plan/weekPlanLabels'
import { formatActiveDurationSecondsPl } from '@/features/workouts/utils/formatWorkoutSessionLabels'
import { weeklySummaryLabels } from '@/features/weekly-summary/weeklySummaryLabels'
import { ProfileDataState } from './ProfileDataState'
import { profileDataUnavailable } from './profileDataUnavailable'
import { profileLabels as labels, profileDateLabel, profileRangeLabel } from './profileLabels'

export function ProfileStatistics({ today }: { today: string }) {
  const { sessions, retrySessions } = useWorkoutData()
  const unavailable = profileDataUnavailable(sessions)
  const summary = unavailable ? null : calculateProfileStatistics(sessions.items, today)
  return <section aria-label={labels.statistics} className="space-y-4 border border-bd bg-surface p-4">
    <h2 className="font-display text-xl font-semibold">{labels.statistics}</h2>
    {unavailable ? <ProfileDataState state={unavailable} retry={retrySessions} message={weeklySummaryLabels[unavailable]} />
      : summary && (summary.firstDate === null ? <p className="text-sm text-muted">{labels.emptyStatistics}</p> : <>
      <div className="space-y-3">
        <h3 className="font-display text-lg font-semibold">{labels.lifetime}</h3>
        <p className="text-sm text-muted">od {profileDateLabel(summary.firstDate, true)}</p>
        <dl className="space-y-3">
          <div className="flex justify-between gap-4"><dt>{labels.workouts}</dt><dd className="tabular-nums">{summary.workoutCount}</dd></div>
          <div className="flex justify-between gap-4"><dt>{labels.duration}</dt><dd className="tabular-nums">{formatActiveDurationSecondsPl(summary.durationSeconds)}</dd></div>
          <div><dt>{labels.rounds}</dt><dd className="mt-1 tabular-nums">
            {summary.sparringRounds === null ? labels.noData : `${summary.unknownRoundWorkouts ? 'co najmniej ' : ''}${summary.sparringRounds}`}
            {summary.unknownRoundWorkouts > 0 && <span className="block text-sm text-muted">(w {summary.unknownRoundWorkouts} {summary.unknownRoundWorkouts === 1 ? 'treningu' : 'treningach'} liczba rund nieznana)</span>}
          </dd></div>
        </dl>
      </div>
      <div className="space-y-3 border-t border-bd pt-4">
        <h3 className="font-display text-lg font-semibold">{labels.recent}</h3>
        <p className="text-sm text-muted">{profileRangeLabel(summary.start, summary.end)}</p>
        {summary.categories.length === 0 ? <p className="text-sm text-muted">{labels.noRecentWorkouts}</p> : <dl className="space-y-3">
          {summary.categories.map((entry) => <div key={entry.category} className="flex justify-between gap-4">
            <dt>{categoryLabel(entry.category)}</dt><dd className="shrink-0 tabular-nums">{formatActiveDurationSecondsPl(entry.durationSeconds)}</dd>
          </div>)}
        </dl>}
        <p className="flex justify-between gap-4 font-semibold"><span>{labels.total}</span><span className="tabular-nums">{formatActiveDurationSecondsPl(summary.recentDurationSeconds)}</span></p>
      </div>
      {sessions.hasPendingWrites && <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p>}
    </>)}
  </section>
}

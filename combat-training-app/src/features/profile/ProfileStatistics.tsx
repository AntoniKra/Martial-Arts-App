import { useWorkoutData } from '@/application/workoutDataContext'
import { useState } from 'react'
import { ProfileDisclosure } from './ProfileDisclosure'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { calculateProfileStatistics } from '@/domain/profile/profileStatistics'
import { categoryLabel } from '@/features/week-plan/weekPlanLabels'
import { weeklySummaryLabels } from '@/features/weekly-summary/weeklySummaryLabels'
import { ProfileDataState } from './ProfileDataState'
import { profileDataUnavailable } from './profileDataUnavailable'
import { profileLabels as labels, profileDateLabel, profileRangeLabel, formatProfileDurationSecondsPl } from './profileLabels'
import { manualPartLabel } from '@/features/manual-workout/manualWorkoutLabels'

export function ProfileStatistics({ today, recentOnly = false }: { today: string; recentOnly?: boolean }) {
  const { sessions, retrySessions } = useWorkoutData()
  const unavailable = profileDataUnavailable(sessions)
  const summary = unavailable ? null : calculateProfileStatistics(sessions.items, today)
  const [open, setOpen] = useState(false)
  const headline = !summary ? weeklySummaryLabels[unavailable!] : summary.firstDate === null ? labels.emptyStatistics
    : `${labels.workoutCount(summary.workoutCount)} · ${formatProfileDurationSecondsPl(summary.durationSeconds)}`
  return <ProfileDisclosure title={labels.statistics} summary={headline} open={open} onToggle={() => setOpen(!open)}>
    {unavailable ? <ProfileDataState state={unavailable} retry={retrySessions} message={weeklySummaryLabels[unavailable]} />
      : summary && (summary.firstDate === null ? <p className="text-sm text-muted">{labels.emptyStatistics}</p> : <>
      {!recentOnly && <div className="space-y-3">
        <h3 className="font-display text-lg font-semibold">{labels.lifetime}</h3>
        <p className="text-sm text-muted">od {profileDateLabel(summary.firstDate, true)}</p>
        <dl className="space-y-3">
          <div className="flex justify-between gap-4"><dt>{labels.workouts}</dt><dd className="tabular-nums">{summary.workoutCount}</dd></div>
          <div className="flex justify-between gap-4"><dt>{labels.duration}</dt><dd className="tabular-nums">{formatProfileDurationSecondsPl(summary.durationSeconds)}</dd></div>
          <div><dt>{labels.rounds}</dt><dd className="mt-1 tabular-nums">
            {summary.sparringRounds === null ? labels.noData : `${summary.unknownRoundWorkouts ? 'co najmniej ' : ''}${summary.sparringRounds}`}
            {summary.unknownRoundWorkouts > 0 && <span className="block text-sm text-muted">{labels.unknownRoundWorkouts(summary.unknownRoundWorkouts)}</span>}
          </dd></div>
        </dl>
      </div>}
      <div className="space-y-3 border-t border-bd pt-4">
        <h3 className="font-display text-lg font-semibold">{labels.recent}</h3>
        <p className="text-sm text-muted">{profileRangeLabel(summary.start, summary.end)}</p>
        {summary.partCounts.length > 0 && <div className="space-y-2">
          <h4 className="font-semibold">{labels.partCounts}</h4>
          <p className="text-sm text-muted">{labels.partCountsHint}</p>
          <ul className="space-y-2">{summary.partCounts.map(({ part, count }) => <li key={part} className="text-sm">{manualPartLabel(part)}: {labels.classes(count)}</li>)}</ul>
        </div>}
        <h4 className="font-semibold">{labels.categoryMinutes}</h4>
        <p className="text-sm text-muted">{labels.categoryMinutesHint}</p>
        {summary.categories.length === 0 ? <p className="text-sm text-muted">{summary.recentDurationSeconds ? labels.noData : labels.noRecentWorkouts}</p> : <dl className="space-y-3">
          {summary.categories.map((entry) => <div key={entry.category} className="flex justify-between gap-4">
            <dt>{entry.category === 'other' ? manualPartLabel('other') : categoryLabel(entry.category)}</dt><dd className="shrink-0 tabular-nums">{formatProfileDurationSecondsPl(entry.durationSeconds)}</dd>
          </div>)}
        </dl>}
        <p className="flex justify-between gap-4 font-semibold"><span>{labels.total}</span><span className="tabular-nums">{formatProfileDurationSecondsPl(summary.recentDurationSeconds)}</span></p>
      </div>
      {sessions.hasPendingWrites && <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p>}
    </>)}
  </ProfileDisclosure>
}

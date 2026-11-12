import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { calculateWeeklySummary, type RecordedTime, type WeeklySummary as WeeklySummaryData } from '@/domain/weekly-summary/weeklySummary'
import { formatActiveDurationSecondsPl } from '@/features/workouts/utils/formatWorkoutSessionLabels'
import { LoadDetails } from './LoadDetails'
import { formatTrainingLoadPl, weeklySummaryLabels as labels } from './weeklySummaryLabels'

function RecordedTimeRow({ time, total, label, recordedLabel }: {
  time: RecordedTime; total: number; label: string; recordedLabel: string
}) {
  const incomplete = time.knownCount < total
  return <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1">
    <dt className="text-sm text-muted">{incomplete ? recordedLabel : label}</dt>
    <dd className="tabular-nums">{total === 0 ? formatActiveDurationSecondsPl(0) : time.seconds === null ? labels.noData : formatActiveDurationSecondsPl(time.seconds)}</dd>
    {incomplete && <dd className="col-span-2 text-xs text-muted">{labels.coverage(time.knownCount, total)}</dd>}
  </div>
}

function LoadRows({ summary: { load, workoutCount } }: { summary: WeeklySummaryData }) {
  const incomplete = load.knownCount < workoutCount
  return <>
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1">
      <dt className="text-sm text-muted">{incomplete ? labels.recordedLoad : labels.load}</dt>
      <dd className="tabular-nums">{workoutCount === 0 ? formatTrainingLoadPl(0) : load.units === null ? labels.noData : formatTrainingLoadPl(load.units)}</dd>
      <dd className="col-span-2 text-xs text-muted">{labels.loadHint}</dd>
      {workoutCount > 0 && <dd className="col-span-2 text-sm">{labels.rpe(load.knownCount, workoutCount)}</dd>}
      {incomplete && load.knownCount > 0 && <dd className="col-span-2 text-xs text-muted">{labels.loadPartial}</dd>}
    </div>
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1">
      <dt className="text-sm text-muted">{labels.loadDuration}</dt>
      <dd className="tabular-nums">{workoutCount === 0 ? formatActiveDurationSecondsPl(0) : load.durationSeconds === null ? labels.noData : formatActiveDurationSecondsPl(load.durationSeconds)}</dd>
    </div>
  </>
}

export function WeeklySummary({ weekStart }: { weekStart: string }) {
  const { sessions, retrySessions } = useWorkoutData()
  const unavailable = sessions.status === 'loading' ? 'loading'
    : sessions.status === 'error' ? 'error'
      : !sessions.complete || sessions.invalidDocumentIds.length > 0 ? 'incomplete' : null
  const summary = unavailable ? null : calculateWeeklySummary(weekStart, sessions.items)
  return <section aria-label={labels.title} className="space-y-4 border border-bd bg-surface p-4">
    <h2 className="font-display text-xl font-semibold">{labels.title}</h2>
    {unavailable ? <div role={unavailable === 'error' ? 'alert' : 'status'} className="space-y-3">
      <p className="text-sm text-muted">{labels[unavailable]}</p>
      {unavailable !== 'loading' && <button type="button" className={getButtonClassName({ variant: 'secondary' })} onClick={retrySessions}>{labels.retry}</button>}
    </div> : summary && <>
      {summary.workoutCount === 0 && <p className="text-sm text-muted">{labels.empty}</p>}
      <p className="font-display text-lg font-semibold">{labels.workouts}: {summary.workoutCount}</p>
      <p className="text-sm text-muted">{labels.completed}: {summary.completedCount} · {labels.partial}: {summary.partialCount}</p>
      <dl className="space-y-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1">
          <dt className="text-sm text-muted">{labels.duration}</dt><dd className="tabular-nums">{formatActiveDurationSecondsPl(summary.durationSeconds)}</dd>
          <dd className="col-span-2 text-xs text-muted">{labels.durationHint}</dd>
        </div>
        <RecordedTimeRow time={summary.work} total={summary.workoutCount} label={labels.work} recordedLabel={labels.recordedWork} />
        <RecordedTimeRow time={summary.sparring} total={summary.workoutCount} label={labels.sparring} recordedLabel={labels.recordedSparring} />
        <LoadRows summary={summary} />
      </dl>
      {summary.sessionLoads.length > 0 && <LoadDetails sessionLoads={summary.sessionLoads} />}
      {sessions.hasPendingWrites && <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p>}
    </>}
  </section>
}

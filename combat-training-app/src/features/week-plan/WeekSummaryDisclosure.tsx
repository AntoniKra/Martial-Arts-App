import { useId, useState } from 'react'
import { DisclosureChevron } from '@/components/ui/DisclosureChevron'
import { useWorkoutData } from '@/application/workoutDataContext'
import { calculateWeeklySummary } from '@/domain/weekly-summary/weeklySummary'
import { WeeklySummary } from '@/features/weekly-summary/WeeklySummary'
import { formatWeeklyLoadPl } from '@/features/weekly-summary/weeklySummaryLabels'
import { scheduleLabels as labels } from './scheduleLabels'

export function WeekSummaryDisclosure({ weekStart }: { weekStart: string }) {
  const { sessions } = useWorkoutData()
  const [open, setOpen] = useState(false)
  const id = useId()
  const ready = sessions.status === 'ready' && sessions.complete && !sessions.invalidDocumentIds.length
  const summary = ready ? calculateWeeklySummary(weekStart, sessions.items) : null
  return <section>
    <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} className="flex min-h-touch w-full items-center gap-3 rounded-[2px] border border-bd bg-surface p-3.5 text-left">
      <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold">{labels.summary}</span>
        {summary && <span className="block text-[13px] text-muted">
          {labels.summaryStats(summary.workoutCount, Math.ceil(summary.durationSeconds / 60), formatWeeklyLoadPl(summary),
            summary.load.knownCount > 0 && summary.load.knownCount < summary.workoutCount)}
        </span>}</span><DisclosureChevron />
    </button>
    <div id={id} hidden={!open}>{open && <WeeklySummary weekStart={weekStart} />}</div>
  </section>
}

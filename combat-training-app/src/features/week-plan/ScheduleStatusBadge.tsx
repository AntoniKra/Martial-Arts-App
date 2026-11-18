import type { ScheduledItemStatus } from '@/domain/week-plan/scheduledWeek'
import { scheduleLabels } from './scheduleLabels'

const appearance: Record<ScheduledItemStatus, string> = {
  done: 'is-done', planned: 'is-planned', missed: 'is-missed', omitted: 'is-missed', partial: 'is-neutral', rest: 'is-neutral',
}

export function ScheduleStatusBadge({ status, changed = false }: { status: ScheduledItemStatus; changed?: boolean }) {
  return <span key={status} className={`status-badge shrink-0 ${appearance[status]} ${changed ? 'motion-status-change' : ''}`}>{scheduleLabels.statuses[status]}</span>
}

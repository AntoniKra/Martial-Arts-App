import { useState } from 'react'
import { useWorkoutData } from '@/application/workoutDataContext'
import type { RecurringWeek, WeekActivity } from '@/domain/week-plan/weekPlan.types'
import { WEEK_PLAN_ITEM_LIMIT } from '@/domain/week-plan/weekPlan.types'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { WeekActivityForm } from './WeekActivityForm'
import { activityDetail, activityTitle, scheduleLabels as labels, weekdays } from './scheduleLabels'
import { weekPlanLabels } from './weekPlanLabels'

export function RecurringWeekEditor({ onClose }: { onClose: () => void }) {
  const { recurringWeeks: state, recurringWeekRepository, retryRecurringWeeks, plans } = useWorkoutData()
  const [editing, setEditing] = useState<WeekActivity | 'new' | null>('new')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const current = state.items[0]
  const ready = state.status === 'ready' && !state.invalidDocumentIds.length && (!!current || state.complete)
  async function save(items: WeekActivity[]) {
    if (!ready || busy) throw new Error('Recurring week unavailable')
    if (items.length > WEEK_PLAN_ITEM_LIMIT) { setError(weekPlanLabels.limit); throw new Error('Too many activities') }
    const now = new Date().toISOString()
    const value: RecurringWeek = { id: 'default', items, createdAt: current?.createdAt ?? now, updatedAt: now }
    setBusy(true); setError(null)
    try { await recurringWeekRepository.save(value); setEditing(null) } finally { setBusy(false) }
  }
  return <div className="flex flex-col gap-[22px]">
    <button type="button" className="min-h-touch self-start text-[13px] text-muted" disabled={busy} onClick={onClose}>{labels.back}</button>
    <h1 className="font-display text-[26px] font-extrabold">{labels.recurring}</h1>
    {!ready && <div role={state.status === 'error' || state.invalidDocumentIds.length ? 'alert' : 'status'} className="space-y-3">
      <p>{state.status === 'loading' ? weekPlanLabels.loading : state.status === 'error' || state.invalidDocumentIds.length ? labels.failed : labels.incomplete}</p>
      <button type="button" className={getButtonClassName({ variant: 'secondary' })} onClick={retryRecurringWeeks}>{weekPlanLabels.retry}</button>
    </div>}
    {state.hasPendingWrites && <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p>}
    {error && <p role="alert" className="text-sm text-crimson-ink">{error}</p>}
    {ready && <>
      {!!current?.items.length && <ul aria-label={labels.recurringList} className="divide-y divide-bd border border-bd bg-surface">{[...current.items].sort((a, b) => (a.day ?? 7) - (b.day ?? 7)).map((item) => <li key={item.id} className="space-y-2 p-3">
        <p className="text-xs text-muted">{item.day === null ? labels.anyDay : weekdays[item.day].name}</p>
        <p className="font-semibold">{activityTitle(item)}</p><p className="text-xs text-muted">{activityDetail(item)}</p>
        <div className="flex gap-2"><button type="button" disabled={busy} className={getButtonClassName({ variant: 'secondary' })} onClick={() => setEditing(item)}>{labels.edit}</button>
          <button type="button" disabled={busy} className={getButtonClassName({ variant: 'ghost' })} onClick={() => { void save(current.items.filter((entry) => entry.id !== item.id)).catch(() => setError(labels.failed)) }}>{labels.remove}</button></div>
      </li>)}</ul>}
      {!current?.items.length && editing === null && <p className="text-sm text-muted">{labels.emptyRecurring}</p>}
      {editing !== null ? <WeekActivityForm key={editing === 'new' ? 'new' : editing.id} initial={editing === 'new' ? undefined : editing} defaultDay={null} recurring
        plans={plans.status === 'ready' && plans.complete && !plans.invalidDocumentIds.length ? plans.items : []}
        onSave={async (items) => { await save([...(current?.items ?? []).filter((item) => editing === 'new' || item.id !== editing.id), ...items]) }} onCancel={() => setEditing(null)} />
        : <button type="button" className={getButtonClassName({ variant: 'secondary' })} onClick={() => setEditing('new')}>{labels.addRecurring}</button>}
    </>}
  </div>
}

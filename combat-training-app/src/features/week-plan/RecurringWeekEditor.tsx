import { useState } from 'react'
import { useWorkoutData } from '@/application/workoutDataContext'
import type { WeekActivity, Weekday } from '@/domain/week-plan/weekPlan.types'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { WeekActivitySheet } from './WeekActivitySheet'
import { WeekScheduleList } from './WeekScheduleList'
import { useRecurringWeekActions } from './useRecurringWeekActions'
import { activityDetail, activityTitle, scheduleLabels as labels } from './scheduleLabels'
import { weekPlanLabels } from './weekPlanLabels'

export function RecurringWeekEditor({ onClose }: { onClose: () => void }) {
  const { recurringWeeks: state, retryRecurringWeeks, plans, currentWeek, weekPlans } = useWorkoutData()
  const actions = useRecurringWeekActions()
  const [editing, setEditing] = useState<{ day: Weekday | null; initial?: WeekActivity } | null>(null)
  const [options, setOptions] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const current = state.items[0]
  async function save(items: WeekActivity[]) {
    setBusy(true); setError(null)
    try { await actions.save(items) } catch (error) { setError(weekPlanLabels.failed); throw error } finally { setBusy(false) }
  }
  return <div className="flex flex-col gap-2.5">
    <button type="button" className="min-h-touch self-start text-[13px] text-muted" disabled={busy} onClick={onClose}>{labels.back}</button>
    <h1 className="font-display text-[28px] font-extrabold">{labels.recurring}</h1>
    {!actions.ready && <div role={state.status === 'error' || state.invalidDocumentIds.length ? 'alert' : 'status'} className="space-y-3">
      <p>{state.status === 'loading' ? weekPlanLabels.loading : state.status === 'error' || state.invalidDocumentIds.length ? labels.failed : labels.incomplete}</p>
      <button type="button" className={getButtonClassName({ variant: 'secondary' })} onClick={retryRecurringWeeks}>{weekPlanLabels.retry}</button>
    </div>}
    {(state.hasPendingWrites || weekPlans.hasPendingWrites) && <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p>}
    {error && <p role="alert" className="text-sm text-crimson-ink">{error}</p>}
    <WeekScheduleList items={current?.items ?? []} recurring weekStart={currentWeek} disabled={!actions.ready || busy} onAdd={(day) => setEditing({ day })} renderEntry={(item) => <div key={item.id}>
      <div className="flex min-h-touch items-center gap-2"><div className="min-w-0 flex-1"><p className="break-words text-[15px] font-bold">{activityTitle(item)}</p><p className="break-words text-[13px] text-muted">{activityDetail(item)}</p></div>
        <button type="button" aria-label={`Opcje: ${activityTitle(item)}`} aria-expanded={options === item.id} disabled={busy} onClick={() => setOptions(options === item.id ? null : item.id)} className="flex size-11 shrink-0 items-center justify-center text-xl text-muted">⋯</button></div>
      {options === item.id && <div className="flex flex-wrap gap-2 pb-2">
        {item.kind !== 'rest' && <button type="button" className={getButtonClassName({ variant: 'ghost' })} onClick={() => setEditing({ day: item.day, initial: item })}>{labels.edit}</button>}
        <button type="button" disabled={busy} className={getButtonClassName({ variant: 'ghost' })} onClick={() => { void save(current!.items.filter((entry) => entry.id !== item.id)).catch(() => {}) }}>{labels.remove}</button>
      </div>}
    </div>} />
    {editing && <WeekActivitySheet {...editing} weekStart={currentWeek} recurring plans={plans.status === 'ready' && plans.complete && !plans.invalidDocumentIds.length ? plans.items : []}
      onSave={async (items) => { await save([...(current?.items ?? []).filter((item) => item.id !== editing.initial?.id), ...items]) }} onClose={() => setEditing(null)} />}
  </div>
}

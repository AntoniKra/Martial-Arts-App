import { useState } from 'react'
import { useWorkoutData } from '@/application/workoutDataContext'
import { changeScheduledWeek } from '@/domain/week-plan/scheduledWeek'
import { WEEK_PLAN_ITEM_LIMIT, type ScheduledWeekItem, type Weekday, type WeekPlan } from '@/domain/week-plan/weekPlan.types'
import { scheduleLabels } from './scheduleLabels'
import { weekPlanLabels } from './weekPlanLabels'

/** The home card and the week editor save the same independent weekly snapshot. */
export function useScheduledWeekActions(plan: WeekPlan, canEdit: boolean) {
  const { weekPlanRepository } = useWorkoutData()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [undo, setUndo] = useState<{ before: ScheduledWeekItem[]; after: string } | null>(null)

  async function save(schedule: ScheduledWeekItem[], targetCount = plan.targetCount ?? 0) {
    if (busy || !canEdit) return false
    if (schedule.length > WEEK_PLAN_ITEM_LIMIT) { setError(weekPlanLabels.limit); return false }
    setBusy(true); setError(null); setSaved(false)
    try {
      await weekPlanRepository.save(changeScheduledWeek(plan, schedule, targetCount, new Date()))
      setSaved(true)
      return true
    } catch { setError(weekPlanLabels.failed); return false } finally { setBusy(false) }
  }
  async function move(item: ScheduledWeekItem, day: Weekday) {
    const before = plan.schedule ?? []
    const next = before.map((entry) => entry.id === item.id ? { ...entry, id: crypto.randomUUID(), day } : entry)
    if (await save(next)) setUndo({ before, after: JSON.stringify(next) })
  }
  function toggleOmitted(item: ScheduledWeekItem) {
    return save((plan.schedule ?? []).map((entry) => entry.id === item.id ? { ...entry, id: crypto.randomUUID(), omitted: !entry.omitted } : entry))
  }
  async function undoMove() {
    if (!undo) return
    if (JSON.stringify(plan.schedule) !== undo.after) { setError(scheduleLabels.undoUnavailable); return }
    if (await save(undo.before)) setUndo(null)
  }
  return { busy, error, saved, undo, save, move, toggleOmitted, undoMove }
}

import { useWorkoutData } from '@/application/workoutDataContext'
import { selectWeekPlan } from '@/application/week-plan/selectWeekPlan'
import { calculateWorkoutDate } from '@/domain/workout-session/workoutSessionDefinitions'
import { updateCurrentWeekFromRecurring } from '@/domain/week-plan/updateRecurringWeek'
import { weekStartForDate } from '@/domain/week-plan/weekCalendar'
import { WEEK_PLAN_ITEM_LIMIT, type RecurringWeek, type WeekActivity, type WeekPlan } from '@/domain/week-plan/weekPlan.types'

/** Both collections, and optionally a different displayed week, use one atomic write. */
export function useRecurringWeekActions() {
  const { recurringWeeks, weekPlans, plans, weekPlanRepository } = useWorkoutData()
  const previous = recurringWeeks.items[0]
  const currentStart = weekStartForDate(calculateWorkoutDate(new Date().toISOString(), 'Europe/Warsaw'))
  const selected = selectWeekPlan(weekPlans, currentStart)
  const ready = recurringWeeks.status === 'ready' && !recurringWeeks.invalidDocumentIds.length && (!!previous || recurringWeeks.complete) && selected.status === 'ready'
  async function save(items: WeekActivity[], displayed?: (current: WeekPlan) => WeekPlan) {
    if (!ready || selected.status !== 'ready') throw new Error('Recurring week unavailable')
    if (items.length > WEEK_PLAN_ITEM_LIMIT) throw new Error('Week plan item limit exceeded')
    const now = new Date()
    const next: RecurringWeek = { id: 'default', items, createdAt: previous?.createdAt ?? now.toISOString(), updatedAt: now.toISOString() }
    const current = updateCurrentWeekFromRecurring(previous, next, selected.plan, now, plans.items)
    const primary = displayed?.(current) ?? current
    await weekPlanRepository.save(primary, next, primary.weekStart === current.weekStart ? undefined : current)
  }
  return { ready, save }
}

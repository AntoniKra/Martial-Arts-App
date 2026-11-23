import { useWorkoutData } from '@/application/workoutDataContext'
import { selectWeekPlan } from '@/application/week-plan/selectWeekPlan'
import { updateCurrentWeekFromRecurring } from '@/domain/week-plan/updateRecurringWeek'
import { currentWeekStart, WEEK_PLAN_TIME_ZONE } from '@/domain/week-plan/weekCalendar'
import { WEEK_PLAN_ITEM_LIMIT, type RecurringWeek, type WeekActivity, type WeekPlan } from '@/domain/week-plan/weekPlan.types'

/** Both collections, and optionally a different displayed week, use one atomic write. */
export function useRecurringWeekActions() {
  const { recurringWeeks, weekPlans, weekPlanRepository } = useWorkoutData()
  const previous = recurringWeeks.items[0]
  const recurringReady = recurringWeeks.status === 'ready' && !recurringWeeks.invalidDocumentIds.length && (!!previous || recurringWeeks.complete)
  const ready = recurringReady && selectWeekPlan(weekPlans, currentWeekStart(new Date(), WEEK_PLAN_TIME_ZONE)).status === 'ready'
  async function save(items: WeekActivity[], displayed?: (current: WeekPlan, now: Date) => WeekPlan, displayedWeek?: WeekPlan) {
    const now = new Date()
    const selected = selectWeekPlan(weekPlans, currentWeekStart(now, WEEK_PLAN_TIME_ZONE))
    if (!recurringReady || selected.status !== 'ready') throw new Error('Recurring week unavailable')
    if (items.length > WEEK_PLAN_ITEM_LIMIT) throw new Error('Week plan item limit exceeded')
    const updatedAt = now.toISOString()
    const next: RecurringWeek = { id: 'default', items, revision: (previous?.revision ?? 0) + 1, createdAt: previous?.createdAt ?? updatedAt, updatedAt }
    const current = updateCurrentWeekFromRecurring(previous, next, selected.plan, now)
    let primary = displayed?.(current, now) ?? current
    // A future snapshot has already seen these identities, even though full reconciliation is deferred until it becomes current.
    if (primary.weekStart !== current.weekStart) primary = { ...primary, appliedRecurringIds: next.items.map((item) => item.id) }
    const displayedBase = primary.weekStart === current.weekStart ? current : displayedWeek ?? weekPlans.items.find((week) => week.weekStart === primary.weekStart)
    await weekPlanRepository.save(primary, next, primary.weekStart === current.weekStart ? undefined : current, {
      operationTime: now, previousRecurring: previous, displayedChange: displayed && displayedBase ? { before: displayedBase, after: primary } : undefined,
    })
  }
  return { ready, save }
}

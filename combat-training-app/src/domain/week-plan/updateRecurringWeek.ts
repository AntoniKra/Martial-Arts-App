import { calculateWorkoutDate, calculateWorkoutSessionCategory } from '@/domain/workout-session/workoutSessionDefinitions'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import { changeScheduledWeek, generateScheduledWeek, recurringOccurrenceId } from './scheduledWeek'
import { shiftCalendarDate, weekStartForDate } from './weekCalendar'
import { WEEK_PLAN_ITEM_LIMIT, type RecurringWeek, type ScheduledWeekItem, type WeekPlan } from './weekPlan.types'

/** Reading v1 is side-effect free. The first mutation saves this representation as v2. */
export function scheduledWeekFromLegacy(plan: WeekPlan, plans: readonly WorkoutPlan[] = []): WeekPlan {
  if (plan.schedule !== undefined) return plan
  return { ...plan, items: [], targetCount: plan.items.length, schedule: plan.items.map((item) => ({
    id: item.id, kind: 'own', day: null, omitted: false,
    category: item.kind === 'category' ? item.category : calculateWorkoutSessionCategory(plans.find((plan) => plan.id === item.workoutPlanId)?.blocks.map((block) => block.blockType) ?? []),
    workoutPlanId: item.kind === 'plan' ? item.workoutPlanId : null,
    planNameSnapshot: item.kind === 'plan' ? item.planNameSnapshot : null,
  })) }
}

/** Stable occurrence IDs link only untouched entries. Manual changes detach the ID. */
export function updateCurrentWeekFromRecurring(previous: RecurringWeek | undefined, next: RecurringWeek, current: WeekPlan | undefined, now: Date, plans: readonly WorkoutPlan[] = []): WeekPlan {
  const today = calculateWorkoutDate(now.toISOString(), 'Europe/Warsaw')
  const weekStart = weekStartForDate(today)
  const base = current ? scheduledWeekFromLegacy(current, plans) : generateScheduledWeek(weekStart, previous, now)
  if (base.weekStart !== weekStart) throw new Error('Expected current Warsaw week')
  const schedule = structuredClone(base.schedule ?? [])
  const upcoming = (day: number | null) => day === null || shiftCalendarDate(weekStart, day) >= today
  for (const [index, old] of (previous?.items ?? []).entries()) {
    const stableId = recurringOccurrenceId(weekStart, old.id)
    const position = schedule.findIndex((item) => item.id === stableId || item.id === `${weekStart}:${index}`)
    if (position < 0) continue // A removed or manually detached occurrence stays untouched.
    const occurrence = schedule[position]
    const { id: _id, omitted, ...actual } = occurrence
    const { id: _oldId, ...expected } = old
    if (omitted || !upcoming(occurrence.day) || JSON.stringify(actual) !== JSON.stringify(expected)) continue
    const replacement = next.items.find((item) => item.id === old.id)
    if (!replacement) schedule.splice(position, 1)
    else if (upcoming(replacement.day)) schedule[position] = { ...structuredClone(replacement), id: stableId, omitted: false }
  }
  for (const item of next.items) {
    if (!previous?.items.some((old) => old.id === item.id) && upcoming(item.day)) {
      schedule.push({ ...structuredClone(item), id: recurringOccurrenceId(weekStart, item.id), omitted: false })
    }
  }
  if (schedule.length > WEEK_PLAN_ITEM_LIMIT) throw new Error('Week plan item limit exceeded')
  const oldCount = base.schedule!.filter((item) => item.kind !== 'rest').length
  const newCount = schedule.filter((item) => item.kind !== 'rest').length
  return changeScheduledWeek(base, schedule as ScheduledWeekItem[], Math.min(14, Math.max(0, (base.targetCount ?? 0) + newCount - oldCount)), now)
}

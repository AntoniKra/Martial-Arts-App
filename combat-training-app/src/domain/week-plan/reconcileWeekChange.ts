import { changeScheduledWeek } from './scheduledWeek'
import { scheduledWeekFromLegacy } from './updateRecurringWeek'
import type { WeekPlan } from './weekPlan.types'

/** Reapply only this operation's delta; retain unrelated changes from another device. */
export function mergeChangedItems<T extends { id: string }>(before: readonly T[], after: readonly T[], fresh: readonly T[]): T[] {
  const removed = new Set(before.filter((item) => !after.some((next) => next.id === item.id)).map((item) => item.id))
  const changed = after.filter((item) => JSON.stringify(item) !== JSON.stringify(before.find((old) => old.id === item.id)))
  return [...fresh.filter((item) => !removed.has(item.id) && !changed.some((next) => next.id === item.id)), ...structuredClone(changed)]
}

export function rebaseWeekChange(before: WeekPlan, after: WeekPlan, fresh: WeekPlan, now: Date): WeekPlan {
  before = scheduledWeekFromLegacy(before)
  after = scheduledWeekFromLegacy(after)
  fresh = scheduledWeekFromLegacy(fresh)
  const schedule = mergeChangedItems(before.schedule!, after.schedule!, fresh.schedule!)
  if (schedule.length > 14) throw new Error('Week plan item limit exceeded')
  return changeScheduledWeek(fresh, schedule, Math.min(14, Math.max(0, (fresh.targetCount ?? 0) + (after.targetCount ?? 0) - (before.targetCount ?? 0))), now)
}

import { WEEK_PLAN_ITEM_LIMIT, type WeekPlan, type WeekPlanItem } from './weekPlan.types'
import { currentWeekStart } from './weekCalendar'

export function editWeekPlan(weekStart: string, items: WeekPlanItem[], previous: WeekPlan | undefined, now: Date, currentWeek = currentWeekStart(now)): WeekPlan {
  if (items.length > WEEK_PLAN_ITEM_LIMIT) throw new Error('Week plan item limit exceeded')
  if (previous && previous.weekStart !== weekStart) throw new Error('Week plan identity mismatch')
  return {
    weekStart, items: structuredClone(items), createdAt: previous?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(), editedAfterWeekEnd: previous?.editedAfterWeekEnd === true || weekStart < currentWeek,
  }
}

export function copyWeekPlanItems(target: readonly WeekPlanItem[], selected: readonly WeekPlanItem[], createId: () => string): WeekPlanItem[] {
  if (target.length + selected.length > WEEK_PLAN_ITEM_LIMIT) throw new Error('Week plan item limit exceeded')
  return [...target, ...selected.map((item) => ({ ...item, id: createId() }))]
}

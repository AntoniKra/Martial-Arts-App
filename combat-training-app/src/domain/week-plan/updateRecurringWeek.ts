import { calculateWorkoutDate } from '@/domain/workout-session/workoutSessionDefinitions'
import { changeScheduledWeek, generateScheduledWeek, recurringOccurrenceId } from './scheduledWeek'
import { shiftCalendarDate, weekStartForDate, WEEK_PLAN_TIME_ZONE } from './weekCalendar'
import { WEEK_PLAN_ITEM_LIMIT, type RecurringWeek, type ScheduledWeekItem, type WeekPlan } from './weekPlan.types'

/** Reading v1 is side-effect free. The first mutation saves this representation as v2. */
export function scheduledWeekFromLegacy(plan: WeekPlan): WeekPlan {
  if (plan.schedule !== undefined) return plan
  return { ...plan, items: [], targetCount: plan.items.length, schedule: plan.items.map((item) => ({
    id: item.id, kind: 'own', day: null, omitted: false,
    category: item.kind === 'category' ? item.category : 'mixed', legacyGoal: structuredClone(item),
    workoutPlanId: item.kind === 'plan' ? item.workoutPlanId : null,
    planNameSnapshot: item.kind === 'plan' ? item.planNameSnapshot : null,
  })) }
}

/** Stable occurrence IDs link only untouched entries. Manual changes detach the ID. */
export function updateCurrentWeekFromRecurring(previous: RecurringWeek | undefined, next: RecurringWeek, current: WeekPlan | undefined, now: Date): WeekPlan {
  const today = calculateWorkoutDate(now.toISOString(), WEEK_PLAN_TIME_ZONE)
  const weekStart = weekStartForDate(today)
  const base = current ? scheduledWeekFromLegacy(current) : generateScheduledWeek(weekStart, previous, now, weekStart)
  if (base.weekStart !== weekStart) throw new Error('Expected current Warsaw week')
  const schedule = structuredClone(base.schedule ?? [])
  const upcoming = (day: number | null) => day === null || shiftCalendarDate(weekStart, day) >= today
  // Remember even removed IDs: manual deletions must not become additions on reconciliation.
  const linkedIds = schedule.flatMap((item) => item.id.startsWith(`${weekStart}:`) && !/^\d+$/.test(item.id.slice(11)) ? [item.id.slice(11)] : [])
  const legacyIds = new Map<string, string>()
  if (!previous && base.appliedRecurringRevision === undefined && base.appliedRecurringIds === undefined) {
    // Pre-176 snapshots have only indexed IDs. Match slots once; time may have changed since the snapshot.
    const claimed = new Set(linkedIds)
    for (const occurrence of schedule) {
      if (!occurrence.id.startsWith(`${weekStart}:`) || !/^\d+$/.test(occurrence.id.slice(11)) || occurrence.legacyGoal) continue
      const match = next.items.find((item) => !claimed.has(item.id) && item.day === occurrence.day && item.kind === occurrence.kind
        && (item.kind !== 'club' || occurrence.kind === 'club' && item.disciplineKey === occurrence.disciplineKey)
        && (item.kind !== 'own' || occurrence.kind === 'own' && item.category === occurrence.category))
      if (match) { legacyIds.set(match.id, occurrence.id); claimed.add(match.id) }
    }
  }
  const previousIds = [...new Set([
    ...(base.appliedRecurringIds ?? previous?.items.map((item) => item.id) ?? linkedIds),
    ...((base.appliedRecurringRevision ?? 0) === 0 && (previous?.revision ?? 0) === 0 ? previous?.items.map((item) => item.id) ?? [] : []),
    ...legacyIds.keys(),
  ])]
  for (const [index, oldId] of previousIds.entries()) {
    const old = previous?.items.find((item) => item.id === oldId)
    const stableId = recurringOccurrenceId(weekStart, oldId)
    const indexedId = previous ? `${weekStart}:${index}` : legacyIds.get(oldId)
    const position = schedule.findIndex((item) => item.id === stableId || item.id === indexedId)
    if (position < 0) continue // A removed or manually detached occurrence stays untouched.
    const occurrence = schedule[position]
    const { id: _id, omitted, ...actual } = occurrence
    const expected = old ? (({ id: _oldId, ...fields }) => fields)(old) : undefined
    if (omitted || !upcoming(occurrence.day) || (expected && (base.appliedRecurringRevision ?? 0) === (previous?.revision ?? 0) && JSON.stringify(actual) !== JSON.stringify(expected))) continue
    const replacement = next.items.find((item) => item.id === oldId)
    if (!replacement) schedule.splice(position, 1)
    else if (upcoming(replacement.day)) schedule[position] = { ...structuredClone(replacement), id: stableId, omitted: false }
  }
  for (const item of next.items) {
    if (!previousIds.includes(item.id) && !schedule.some((entry) => entry.id === recurringOccurrenceId(weekStart, item.id)) && upcoming(item.day)) {
      schedule.push({ ...structuredClone(item), id: recurringOccurrenceId(weekStart, item.id), omitted: false })
    }
  }
  if (schedule.length > WEEK_PLAN_ITEM_LIMIT) throw new Error('Week plan item limit exceeded')
  const oldCount = base.schedule!.filter((item) => item.kind !== 'rest').length
  const newCount = schedule.filter((item) => item.kind !== 'rest').length
  return { ...changeScheduledWeek(base, schedule as ScheduledWeekItem[], Math.min(14, Math.max(0, (base.targetCount ?? 0) + newCount - oldCount)), now, weekStart),
    appliedRecurringRevision: next.revision ?? 0, appliedRecurringIds: next.items.map((item) => item.id) }
}

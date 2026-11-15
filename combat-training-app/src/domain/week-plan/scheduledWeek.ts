import type { WorkoutSession, WorkoutSessionCategory } from '@/domain/workout-session/workoutSession.types'
import { currentWeekStart, shiftCalendarDate } from './weekCalendar'
import type { RecurringWeek, ScheduledWeekItem, WeekPlan, Weekday } from './weekPlan.types'

export function generateScheduledWeek(weekStart: string, recurring: RecurringWeek | undefined, now: Date): WeekPlan {
  return {
    weekStart, items: [], schedule: (recurring?.items ?? []).map((item, index) => ({ ...structuredClone(item), id: `${weekStart}:${index}`, omitted: false })),
    targetCount: recurring?.items.filter((item) => item.kind !== 'rest').length ?? 0,
    createdAt: now.toISOString(), updatedAt: now.toISOString(), editedAfterWeekEnd: weekStart < currentWeekStart(now),
  }
}

export function changeScheduledWeek(plan: WeekPlan, schedule: ScheduledWeekItem[], targetCount: number, now: Date): WeekPlan {
  return { ...plan, schedule: structuredClone(schedule), targetCount, updatedAt: now.toISOString(),
    editedAfterWeekEnd: plan.editedAfterWeekEnd || plan.weekStart < currentWeekStart(now) }
}

export function scheduledItemDate(weekStart: string, day: Weekday | null): string | null {
  return day === null ? null : shiftCalendarDate(weekStart, day)
}

function fits(item: ScheduledWeekItem, session: WorkoutSession, weekStart: string) {
  if (item.kind === 'rest' || item.omitted) return false
  const date = scheduledItemDate(weekStart, item.day)
  if (date !== null && date !== session.workoutDate) return false
  const parts = session.source === 'manual' && session.parts ? session.parts : [session.category]
  if (item.kind === 'own') return parts.some((part) => part === item.category)
  return session.disciplineKey === item.disciplineKey && (!item.parts.length || item.parts.some((part) => parts.some((entry) => entry === part)))
}

export type ScheduledItemStatus = 'done' | 'planned' | 'missed' | 'omitted' | 'rest'

/** A saved session counts once. Augmenting paths maximize matches across days and flexible entries. */
export function calculateScheduledWeek(plan: WeekPlan, sessions: readonly WorkoutSession[], today: string) {
  const end = shiftCalendarDate(plan.weekStart, 7)
  const ordered = sessions.filter((session) => session.workoutDate >= plan.weekStart && session.workoutDate < end)
    .sort((a, b) => a.workoutDate.localeCompare(b.workoutDate) ||
      (a.source === 'manual' ? a.createdAt : a.startedAt).localeCompare(b.source === 'manual' ? b.createdAt : b.startedAt) || a.id.localeCompare(b.id))
  const matches = (plan.schedule ?? []).map((item) => ({ item, session: null as WorkoutSession | null }))
  function assign(session: WorkoutSession, visited: Set<string>): boolean {
    const candidates = matches.filter(({ item }) => !visited.has(item.id) && fits(item, session, plan.weekStart))
    const free = candidates.find((match) => !match.session)
    if (free) { free.session = session; return true }
    for (const match of candidates) {
      visited.add(match.item.id)
      if (match.session && assign(match.session, visited)) { match.session = session; return true }
    }
    return false
  }
  for (const session of ordered) assign(session, new Set())
  const used = new Set(matches.flatMap(({ session }) => session ? [session.id] : []))
  const categories = new Set<WorkoutSessionCategory>()
  for (const { item } of matches) {
    if (item.kind === 'own') categories.add(item.category)
    if (item.kind === 'club') for (const part of item.parts) if (part !== 'other') categories.add(part)
  }
  const types = [...categories].map((category) => ({ category,
    planned: matches.filter(({ item }) => item.kind === 'own' ? item.category === category : item.kind === 'club' && item.parts.some((part) => part === category)).length,
    completed: ordered.filter((session) => session.source === 'manual' && session.parts ? session.parts.some((part) => part === category) : session.category === category).length,
  }))
  return {
    types,
    matches: matches.map((match) => {
      const date = scheduledItemDate(plan.weekStart, match.item.day)
      const status: ScheduledItemStatus = match.item.kind === 'rest' ? 'rest' : match.item.omitted ? 'omitted' : match.session ? 'done' :
        (date ?? shiftCalendarDate(plan.weekStart, 6)) < today ? 'missed' : 'planned'
      return { ...match, status }
    }),
    extra: ordered.filter((session) => !used.has(session.id)), workoutCount: ordered.length,
    targetCount: plan.targetCount ?? 0,
    percentage: plan.targetCount ? Math.min(100, ordered.length / plan.targetCount * 100) : null,
  }
}

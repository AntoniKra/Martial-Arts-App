import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import type { WeekPlan, WeekPlanItem } from './weekPlan.types'
import { shiftCalendarDate } from './weekCalendar'
import { calculateScheduledWeek } from './scheduledWeek'

export interface WeekPlanMatch {
  item: WeekPlanItem
  session: WorkoutSession | null
}

/** Completed exact plans, completed categories, partial exact plans, partial categories. */
export function calculateWeekPlanProgress(weekStart: string, plan: WeekPlan | undefined, sessions: readonly WorkoutSession[]) {
  if (plan?.schedule !== undefined) {
    const progress = calculateScheduledWeek(plan, sessions, weekStart)
    const unfulfilled = progress.matches.filter((match) => match.item.kind !== 'rest' && !match.session).length
    return { hasGoal: progress.targetCount > 0, matches: [] as WeekPlanMatch[], completed: Math.min(progress.workoutCount, progress.targetCount),
      partial: 0, unfulfilled, extra: progress.extra, workoutCount: progress.workoutCount, total: progress.targetCount, percentage: progress.percentage }
  }
  const end = shiftCalendarDate(weekStart, 7)
  const ordered = sessions.filter((session) => session.workoutDate >= weekStart && session.workoutDate < end)
    .sort((a, b) => {
      const aTime = a.source === 'manual' ? a.createdAt : a.startedAt
      const bTime = b.source === 'manual' ? b.createdAt : b.startedAt
      return compare(a.workoutDate, b.workoutDate) || compare(aTime, bTime) || compare(a.id, b.id)
    })
  const matches: WeekPlanMatch[] = (plan?.items ?? []).map((item) => ({ item, session: null }))
  const used = new Set<string>()
  for (const status of ['completed', 'partial'] as const) {
    for (const kind of ['plan', 'category'] as const) {
      // Earlier phases stay reserved. Within this phase, follow augmenting paths
      // to maximize matches without assigning a session to more than one goal.
      const available = matches.filter((match) => match.item.kind === kind && !match.session)
      function assign(session: WorkoutSession, visited: Set<WeekPlanMatch>): boolean {
        const candidates = available.filter((match) => {
          const { item } = match
          return !visited.has(match) && (item.kind === 'plan'
            ? session.source === 'plan' && item.workoutPlanId === session.workoutPlanId
            : session.source === 'manual' && session.parts ? session.parts.some((part) => part === item.category) : item.category === session.category)
        })
        // Prefer free goals, preserving chronological order when no reassignment is needed.
        const free = candidates.find((match) => !match.session)
        if (free) { free.session = session; return true }
        for (const match of candidates) {
          visited.add(match)
          if (match.session && assign(match.session, visited)) { match.session = session; return true }
        }
        return false
      }
      for (const session of ordered) {
        if (session.status !== status || used.has(session.id)) continue
        if (assign(session, new Set())) used.add(session.id)
      }
    }
  }
  const completed = matches.filter(({ session }) => session?.status === 'completed').length
  const partial = matches.filter(({ session }) => session?.status === 'partial').length
  const hasGoal = matches.length > 0
  return {
    hasGoal, matches, completed, partial, unfulfilled: matches.length - completed - partial,
    extra: hasGoal ? ordered.filter((session) => !used.has(session.id)) : [],
    workoutCount: ordered.length, total: matches.length,
    percentage: hasGoal ? Math.min(100, completed / matches.length * 100) : null,
  }
}

function compare(a: string, b: string) { return a < b ? -1 : a > b ? 1 : 0 }

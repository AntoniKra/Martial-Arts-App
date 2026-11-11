import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import type { WeekPlan, WeekPlanItem } from './weekPlan.types'
import { shiftCalendarDate } from './weekCalendar'

export interface WeekPlanMatch {
  item: WeekPlanItem
  session: WorkoutSession | null
}

/** Completed exact plans, completed categories, partial exact plans, partial categories. */
export function calculateWeekPlanProgress(weekStart: string, plan: WeekPlan | undefined, sessions: readonly WorkoutSession[]) {
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
      for (const session of ordered) {
        if (session.status !== status || used.has(session.id)) continue
        const match = matches.find(({ item, session: matched }) => !matched && item.kind === kind && (
          item.kind === 'plan' ? session.source === 'plan' && item.workoutPlanId === session.workoutPlanId
            : item.category === session.category
        ))
        if (match) { match.session = session; used.add(session.id) }
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

import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import type { WeekPlan } from './weekPlan.types'
import { calculateLegacyWeekProgress } from './legacyWeekProgress'
import { calculateScheduledWeek } from './scheduledWeek'
export type { WeekPlanMatch } from './legacyWeekProgress'

/** Start, Progress and the weekly view use the same matches and goal calculation. */
export function calculateWeekPlanProgress(weekStart: string, plan: WeekPlan | undefined, sessions: readonly WorkoutSession[], today = weekStart) {
  const legacy = calculateLegacyWeekProgress(weekStart, plan, sessions)
  if (!plan) return { ...legacy, goalCount: legacy.completed, scheduleProgress: null }
  const progress = calculateScheduledWeek(plan, sessions, today)
  const migrated = plan.schedule?.some((item) => item.legacyGoal)
  return { hasGoal: progress.targetCount > 0,
    matches: plan.schedule === undefined ? legacy.matches : migrated ? progress.matches.flatMap((match) => match.item.legacyGoal ? [{ item: match.item.legacyGoal, session: match.session }] : []) : [],
    completed: Math.min(progress.goalCount, progress.targetCount), goalCount: progress.goalCount, partial: progress.partialCount,
    unfulfilled: progress.matches.filter((match) => match.item.kind !== 'rest' && !match.session).length,
    extra: progress.extra, workoutCount: progress.workoutCount, total: progress.targetCount,
    percentage: progress.percentage, scheduleProgress: progress }
}

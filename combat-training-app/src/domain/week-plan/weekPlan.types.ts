import type { WorkoutSessionCategory } from '@/domain/workout-session/workoutSession.types'

export const WEEK_PLAN_ITEM_LIMIT = 14
export const WEEK_PLAN_HISTORY_WEEKS = 12

export type WeekPlanItem =
  | { id: string; kind: 'plan'; workoutPlanId: string; planNameSnapshot: string }
  | { id: string; kind: 'category'; category: WorkoutSessionCategory }

export interface WeekPlan {
  weekStart: string
  items: WeekPlanItem[]
  createdAt: string
  updatedAt: string
  editedAfterWeekEnd: boolean
}

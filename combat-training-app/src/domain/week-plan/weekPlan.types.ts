import type { WorkoutSessionCategory } from '@/domain/workout-session/workoutSession.types'
import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { ManualWorkoutPart } from '@/domain/workout-session/workoutSession.types'

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
  schedule?: ScheduledWeekItem[]
  targetCount?: number
  revision?: number
  appliedRecurringRevision?: number
  appliedRecurringIds?: string[]
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type WeekActivity =
  | { id: string; kind: 'club'; day: Weekday; disciplineKey: DisciplineKey; startTime: string; endTime: string; parts: ManualWorkoutPart[]; clubName: string | null }
  | { id: string; kind: 'own'; day: Weekday | null; category: WorkoutSessionCategory; workoutPlanId: string | null; planNameSnapshot: string | null }
  | { id: string; kind: 'rest'; day: Weekday }

export type ScheduledWeekItem = WeekActivity & { omitted: boolean; legacyGoal?: WeekPlanItem }

export interface RecurringWeek {
  id: 'default'
  items: WeekActivity[]
  createdAt: string
  updatedAt: string
  revision?: number
}

import type { RepositorySnapshot } from '../repositorySubscription'
import type { RecurringWeek, WeekPlan } from '@/domain/week-plan/weekPlan.types'

export interface WeekPlanSnapshot extends RepositorySnapshot<WeekPlan> {
  rangeStart: string
  complete: boolean
}

export interface WeekPlanRepository {
  subscribe(currentWeek: string, onChange: (snapshot: WeekPlanSnapshot) => void, onError: (error: unknown) => void): () => void
  save(plan: WeekPlan, recurring?: RecurringWeek, additionalWeek?: WeekPlan, intent?: WeekPlanSaveIntent): Promise<void>
  reconcile(recurring: RecurringWeek, now: Date): Promise<void>
}

export interface WeekPlanSaveIntent {
  previousRecurring?: RecurringWeek
  displayedChange?: { before: WeekPlan; after: WeekPlan }
  reconcileOnly?: boolean
}

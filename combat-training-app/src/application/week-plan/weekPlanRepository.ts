import type { RepositorySnapshot } from '../repositorySubscription'
import type { WeekPlan } from '@/domain/week-plan/weekPlan.types'

export interface WeekPlanSnapshot extends RepositorySnapshot<WeekPlan> {
  rangeStart: string
  complete: boolean
}

export interface WeekPlanRepository {
  subscribe(currentWeek: string, onChange: (snapshot: WeekPlanSnapshot) => void, onError: (error: unknown) => void): () => void
  save(plan: WeekPlan): Promise<void>
}

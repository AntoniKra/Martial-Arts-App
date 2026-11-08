import type { WorkoutPlan } from '@/domain/workout/workout.types'
import type { SubscribableRepository } from '@/application/repositorySubscription'

export interface WorkoutPlanRepository extends SubscribableRepository<WorkoutPlan> {
  save(plan: WorkoutPlan): Promise<void>
  delete(id: string): Promise<void>
}

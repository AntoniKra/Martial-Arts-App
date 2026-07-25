import type { WorkoutPlan } from '@/domain/workout/workout.types'

export interface WorkoutPlanRepository {
  save(plan: WorkoutPlan): Promise<void>
  list(): Promise<WorkoutPlan[]>
  getById(id: string): Promise<WorkoutPlan | null>
}

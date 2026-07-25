import type { WorkoutPlanRepository } from '@/application/workout/workoutPlanRepository'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import { LocalStorageWorkoutPlanRepository } from '@/infrastructure/storage/localStorageWorkoutPlanRepository'
import { WorkoutPlanStorageError } from '@/infrastructure/storage/workoutPlanStorageSchema'

class UnavailableStorageWorkoutPlanRepository implements WorkoutPlanRepository {
  private readonly error = new WorkoutPlanStorageError(
    'read_failed',
    'Browser storage is unavailable.',
  )

  save(_plan: WorkoutPlan): Promise<void> {
    return Promise.reject(this.error)
  }

  list(): Promise<WorkoutPlan[]> {
    return Promise.reject(this.error)
  }

  getById(_id: string): Promise<WorkoutPlan | null> {
    return Promise.reject(this.error)
  }
}

export function createWorkoutPlanRepository(): WorkoutPlanRepository {
  try {
    return new LocalStorageWorkoutPlanRepository(window.localStorage)
  } catch {
    return new UnavailableStorageWorkoutPlanRepository()
  }
}

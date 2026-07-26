import type { WorkoutSessionRepository } from '@/application/workout-session/workoutSessionRepository'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { LocalStorageWorkoutSessionRepository } from '@/infrastructure/storage/localStorageWorkoutSessionRepository'
import { WorkoutSessionStorageError } from '@/infrastructure/storage/workoutSessionStorageSchema'

class UnavailableStorageWorkoutSessionRepository implements WorkoutSessionRepository {
  private readonly error = new WorkoutSessionStorageError(
    'read_failed',
    'Browser storage is unavailable.',
  )

  save(_session: WorkoutSession): Promise<void> {
    return Promise.reject(this.error)
  }

  list(): Promise<WorkoutSession[]> {
    return Promise.reject(this.error)
  }

  getById(_id: string): Promise<WorkoutSession | null> {
    return Promise.reject(this.error)
  }

  updateNote(_id: string, _note: string | null): Promise<boolean> {
    return Promise.reject(this.error)
  }

  delete(_id: string): Promise<boolean> {
    return Promise.reject(this.error)
  }
}

export function createWorkoutSessionRepository(): WorkoutSessionRepository {
  try {
    return new LocalStorageWorkoutSessionRepository(window.localStorage)
  } catch {
    return new UnavailableStorageWorkoutSessionRepository()
  }
}

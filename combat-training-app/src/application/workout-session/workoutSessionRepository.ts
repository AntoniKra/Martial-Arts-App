import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'

export interface WorkoutSessionRepository {
  save(session: WorkoutSession): Promise<void>
  list(): Promise<WorkoutSession[]>
  getById(id: string): Promise<WorkoutSession | null>
  updateNote(id: string, note: string | null): Promise<boolean>
  delete(id: string): Promise<boolean>
}

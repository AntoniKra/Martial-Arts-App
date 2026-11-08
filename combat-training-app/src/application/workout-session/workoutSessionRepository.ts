import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import type { SubscribableRepository } from '@/application/repositorySubscription'
import type { WorkoutFeedbackUpdate } from '@/domain/workout-session/workoutFeedback'

export interface WorkoutSessionRepository extends SubscribableRepository<WorkoutSession> {
  save(session: WorkoutSession): Promise<void>
  updateNote(id: string, note: string | null): Promise<boolean>
  saveFeedback(id: string, feedback: WorkoutFeedbackUpdate): Promise<boolean>
  delete(id: string): Promise<boolean>
}

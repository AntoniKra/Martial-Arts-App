import type { ManualWorkoutSession, WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import type { SubscribableRepository } from '@/application/repositorySubscription'
import type { FocusCorrectionUpdate, WorkoutFeedbackUpdate } from '@/domain/workout-session/workoutFeedback'

export interface WorkoutSessionRepository extends SubscribableRepository<WorkoutSession> {
  save(session: WorkoutSession): Promise<void>
  saveManual(session: ManualWorkoutSession, correctionUpdates: readonly FocusCorrectionUpdate[]): Promise<void>
  updateNote(id: string, note: string | null): Promise<boolean>
  saveFeedback(id: string, feedback: WorkoutFeedbackUpdate): Promise<boolean>
  saveRpe(id: string, rpe: number, recordedAt: string): Promise<boolean>
  delete(id: string): Promise<boolean>
}

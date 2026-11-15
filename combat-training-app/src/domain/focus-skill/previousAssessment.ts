import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { hasCompletedExercise } from '@/domain/workout-session/workoutFeedback'

/** Same identity and criterion, strictly before this entry; never infer identity from names. */
export function findPreviousAssessment(current: { id: string; workoutDate: string; createdAt?: string },
  focusSkillId: string, criterion: string, sessions: readonly WorkoutSession[]) {
  const before = sessions.filter((session) => session.id !== current.id &&
    (session.workoutDate < current.workoutDate || (session.workoutDate === current.workoutDate &&
      (!current.createdAt || session.createdAt < current.createdAt))))
    .sort((a, b) => b.workoutDate.localeCompare(a.workoutDate) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
  for (const session of before) {
    if (session.source === 'quickTimer') continue
    const rating = [...session.focusRatings].reverse().find((value) => value.focusSkillId === focusSkillId
      && value.criterionSnapshot === criterion && value.assessment !== null
      && (session.source === 'manual' || (value.workoutItemId !== null && hasCompletedExercise(session, value.workoutItemId))))
    if (rating) return { assessment: rating.assessment, workoutDate: session.workoutDate, blockType: rating.blockType }
  }
  return null
}

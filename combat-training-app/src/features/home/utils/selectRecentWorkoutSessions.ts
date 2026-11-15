import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'

export function selectRecentWorkoutSessions(sessions: readonly WorkoutSession[]): WorkoutSession[] {
  return [...sessions]
    .sort((left, right) => right.workoutDate.localeCompare(left.workoutDate)
      || Date.parse(right.source === 'manual' ? right.createdAt : right.completedAt) - Date.parse(left.source === 'manual' ? left.createdAt : left.completedAt)
      || left.id.localeCompare(right.id))
    .slice(0, 3)
}

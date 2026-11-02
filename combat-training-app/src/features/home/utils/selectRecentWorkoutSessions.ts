import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'

export function selectRecentWorkoutSessions(sessions: readonly WorkoutSession[]): WorkoutSession[] {
  return [...sessions]
    .sort((left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt))
    .slice(0, 3)
}

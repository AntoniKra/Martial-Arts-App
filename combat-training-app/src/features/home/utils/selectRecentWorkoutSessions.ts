import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'

export function selectRecentWorkoutSessions(sessions: readonly WorkoutSession[]): WorkoutSession[] {
  return [...sessions]
    .sort((left, right) => (right.source === 'manual' ? right.workoutDate : right.completedAt).localeCompare(left.source === 'manual' ? left.workoutDate : left.completedAt))
    .slice(0, 3)
}

import type { PlanWorkoutSession, WorkoutSession } from './workoutSession.types'

export function selectRpeReminder(sessions: readonly WorkoutSession[], dismissedIds: readonly string[], now: number): PlanWorkoutSession | null {
  return sessions.filter((session): session is PlanWorkoutSession => session.source === 'plan'
    && session.rpe === null && !dismissedIds.includes(session.id)
    && Date.parse(session.completedAt) <= now
    && now - Date.parse(session.completedAt) <= 24 * 60 * 60_000)
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))[0] ?? null
}

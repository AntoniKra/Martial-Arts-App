import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'

export function workoutSessionName(session: WorkoutSession): string {
  return session.source === 'plan' ? session.workoutPlanNameSnapshot : session.source === 'quickTimer' ? 'Szybki stoper' : 'Trening poza aplikacją'
}

export function workoutSessionDate(session: WorkoutSession): string {
  return session.source === 'manual' ? session.workoutDate : session.completedAt
}

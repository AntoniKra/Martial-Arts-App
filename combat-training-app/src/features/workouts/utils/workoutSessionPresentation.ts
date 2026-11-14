import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { categoryLabel } from '@/features/week-plan/weekPlanLabels'
import { manualPartsLabel } from '@/features/manual-workout/manualWorkoutLabels'

export function workoutSessionName(session: WorkoutSession): string {
  return session.source === 'plan' ? session.workoutPlanNameSnapshot : session.source === 'quickTimer' ? 'Szybki stoper' : `Trening poza aplikacją · ${session.parts ? manualPartsLabel(session.parts) : categoryLabel(session.category)}`
}

export function workoutSessionDate(session: WorkoutSession): string {
  return session.source === 'manual' ? session.workoutDate : session.completedAt
}

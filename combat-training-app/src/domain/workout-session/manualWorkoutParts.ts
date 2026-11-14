import { MANUAL_WORKOUT_PARTS, type ManualWorkoutPart, type ManualWorkoutSession, type WorkoutSessionCategory } from './workoutSession.types'

export function manualWorkoutCategory(parts: readonly ManualWorkoutPart[]): WorkoutSessionCategory {
  return parts.length === 1 && parts[0] !== 'other' ? parts[0] : 'mixed'
}

/** A legacy mixed entry has no recoverable breakdown. Never invent its parts. */
export function manualSessionParts(session: ManualWorkoutSession): ManualWorkoutPart[] {
  if (session.parts) return [...session.parts]
  const parts: ManualWorkoutPart[] = MANUAL_WORKOUT_PARTS.filter((part) => part === session.category)
  if (session.category === 'strengthAndConditioning') parts.push('other')
  if (session.sparring.length && !parts.includes('sparring')) parts.push('sparring')
  return parts
}

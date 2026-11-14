import type { WorkoutPlaybackStep } from '@/domain/workout-playback/workoutPlayback.types'
import type { WorkoutEndWarnings } from '@/domain/workout-playback/workoutEndWarning'

export function selectEndWarningSeconds(step: WorkoutPlaybackStep, settings: WorkoutEndWarnings): number | null {
  const value = step.kind === 'exercise' ? settings.round : settings.rest
  // Keep the existing minimum exercise length; rests use their independent threshold.
  if (value === 'off' || (step.kind === 'exercise' && step.durationSeconds <= 30)) return null
  return Number(value)
}

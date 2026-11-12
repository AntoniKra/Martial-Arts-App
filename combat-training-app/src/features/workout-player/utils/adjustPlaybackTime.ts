import type { WorkoutPlaybackState, WorkoutPlaybackStep } from '@/domain/workout-playback/workoutPlayback.types'

export function applyStepDurations(steps: readonly WorkoutPlaybackStep[], durations: Record<string, number> = {}): WorkoutPlaybackStep[] {
  return steps.map((step) => ({ ...step, durationSeconds: durations[step.id] ?? step.durationSeconds }))
}

/** The deadline remains the clock source; rounding is only for the displayed value. */
export function adjustPlaybackTime(
  playback: WorkoutPlaybackState,
  step: WorkoutPlaybackStep,
  deadlineMs: number | null,
  pausedRemainingMs: number | null,
  deltaSeconds: -15 | 15,
  nowMs: number,
) {
  const remainingMs = playback.status === 'paused'
    ? pausedRemainingMs ?? playback.remainingSeconds * 1000
    : Math.max(0, (deadlineMs ?? nowMs) - nowMs)
  const adjustedRemainingMs = Math.max(0, remainingMs + deltaSeconds * 1000)
  return {
    step: { ...step, durationSeconds: Math.max(1, step.durationSeconds + deltaSeconds) },
    playback: { ...playback, remainingSeconds: Math.ceil(adjustedRemainingMs / 1000) },
    deadlineMs: playback.status === 'running' ? nowMs + adjustedRemainingMs : null,
    pausedRemainingMs: playback.status === 'paused' ? adjustedRemainingMs : null,
  }
}

import type { WorkoutPlaybackState } from '@/domain/workout-playback/workoutPlayback.types'

export interface PausedPlayback {
  playback: WorkoutPlaybackState
  remainingMs: number
}

/**
 * Freezes a running step that has not elapsed yet. The exact remaining milliseconds are kept for
 * resuming; whole seconds are rounded up only for display, so repeated pauses never add time.
 */
export function pauseRunningStep(
  running: WorkoutPlaybackState,
  deadlineMs: number,
  nowMs: number,
): PausedPlayback {
  const remainingMs = Math.max(0, deadlineMs - nowMs)

  return {
    playback: {
      ...running,
      status: 'paused',
      remainingSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
    },
    remainingMs,
  }
}

/**
 * Deadline for resuming a paused step. The stored milliseconds apply only to the exact paused state
 * they were taken from; after moving to another step or restarting, whole seconds are used instead.
 */
export function getResumeDeadlineMs(
  paused: WorkoutPlaybackState,
  stored: PausedPlayback | null,
  nowMs: number,
): number {
  const remainingMs = stored !== null && stored.playback === paused
    ? stored.remainingMs
    : paused.remainingSeconds * 1000

  return nowMs + remainingMs
}

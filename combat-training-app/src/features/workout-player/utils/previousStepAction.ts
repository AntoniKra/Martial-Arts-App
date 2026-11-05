import type { WorkoutPlaybackState } from '@/features/workout-player/types/workoutPlayback.types'
import type { PausedPlayback } from '@/features/workout-player/utils/playbackPause'

/** docs/workout-player-spec.md: after more than 3 seconds "Poprzedni" restarts the current step. */
export const PREVIOUS_RESTART_THRESHOLD_MS = 3000

export type PreviousStepAction = 'restartCurrent' | 'goToPrevious'

export function choosePreviousStepAction(currentStepIndex: number, elapsedInStepMs: number): PreviousStepAction {
  if (currentStepIndex === 0) return 'restartCurrent'
  return elapsedInStepMs > PREVIOUS_RESTART_THRESHOLD_MS ? 'restartCurrent' : 'goToPrevious'
}

/**
 * Milliseconds already spent in the current step. A running step uses its deadline; a paused step
 * uses the exact milliseconds stored at pause time, falling back to whole seconds like resume does.
 */
export function getElapsedInStepMs(
  current: WorkoutPlaybackState,
  durationSeconds: number,
  deadlineMs: number | null,
  stored: PausedPlayback | null,
  nowMs: number,
): number {
  const remainingMs = current.status === 'running' && deadlineMs !== null
    ? Math.max(0, deadlineMs - nowMs)
    : stored !== null && stored.playback === current
      ? stored.remainingMs
      : current.remainingSeconds * 1000

  return Math.max(0, durationSeconds * 1000 - remainingMs)
}

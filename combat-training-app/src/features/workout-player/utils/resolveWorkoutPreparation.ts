import type { WorkoutPlaybackState, WorkoutPlaybackStep } from '@/domain/workout-playback/workoutPlayback.types'
import { resolveRunningPlaybackAtTime, type RunningPlaybackResolution } from '@/features/workout-player/utils/resolveRunningPlaybackAtTime'

interface WorkoutPreparationResolution extends RunningPlaybackResolution {
  startedAtMs: number | null
}

/** Preparation has its own deadline and never becomes a session step. */
export function resolveWorkoutPreparation(
  playback: WorkoutPlaybackState,
  deadlineMs: number,
  nowMs: number,
  steps: readonly WorkoutPlaybackStep[],
  startNow = false,
): WorkoutPreparationResolution {
  if (playback.status !== 'preparing' || steps.length === 0) {
    return { playback, deadlineMs, startedAtMs: null }
  }

  if (!startNow && nowMs < deadlineMs) {
    return {
      playback: { ...playback, remainingSeconds: Math.ceil((deadlineMs - nowMs) / 1000) },
      deadlineMs,
      startedAtMs: null,
    }
  }

  // A late click must catch up from the original deadline, just like a delayed tick.
  const startedAtMs = Math.min(nowMs, deadlineMs)
  const running: WorkoutPlaybackState = {
    ...playback,
    status: 'running',
    currentStepIndex: 0,
    remainingSeconds: steps[0].durationSeconds,
  }
  return {
    ...resolveRunningPlaybackAtTime(running, startedAtMs + steps[0].durationSeconds * 1000, nowMs, steps),
    startedAtMs,
  }
}

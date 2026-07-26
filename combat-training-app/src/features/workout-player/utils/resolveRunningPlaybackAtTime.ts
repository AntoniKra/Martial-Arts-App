import type { WorkoutPlaybackState, WorkoutPlaybackStep } from '@/features/workout-player/types/workoutPlayback.types'

export interface RunningPlaybackResolution {
  playback: WorkoutPlaybackState
  deadlineMs: number | null
}

export function resolveRunningPlaybackAtTime(
  playback: WorkoutPlaybackState,
  deadlineMs: number,
  nowMs: number,
  steps: readonly WorkoutPlaybackStep[],
): RunningPlaybackResolution {
  if (playback.status !== 'running') {
    return {
      playback,
      deadlineMs,
    }
  }

  if (steps.length === 0) {
    return {
      playback: {
        ...playback,
        status: 'completed',
        currentStepIndex: 0,
        remainingSeconds: 0,
      },
      deadlineMs: null,
    }
  }

  let stepIndex = playback.currentStepIndex
  let deadline = deadlineMs
  let guard = 0
  const maxIterations = steps.length + 1

  while (nowMs >= deadline && guard < maxIterations) {
    guard += 1
    const nextIndex = stepIndex + 1

    if (nextIndex >= steps.length) {
      return {
        playback: {
          ...playback,
          status: 'completed',
          currentStepIndex: stepIndex,
          remainingSeconds: 0,
        },
        deadlineMs: null,
      }
    }

    stepIndex = nextIndex
    deadline += steps[stepIndex].durationSeconds * 1000
  }

  const remainingSeconds = Math.max(0, Math.ceil((deadline - nowMs) / 1000))

  return {
    playback: {
      ...playback,
      status: 'running',
      currentStepIndex: stepIndex,
      remainingSeconds,
    },
    deadlineMs: deadline,
  }
}

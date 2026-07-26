import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  ExpectedStepNavigation,
  WorkoutPlaybackState,
  WorkoutPlaybackStatus,
  WorkoutPlaybackStep,
  WorkoutPlaybackTimeline,
} from '@/features/workout-player/types/workoutPlayback.types'
import { resolveRunningPlaybackAtTime } from '@/features/workout-player/utils/resolveRunningPlaybackAtTime'

const TICK_INTERVAL_MS = 250
const INITIAL_STEP_REVISION = 1

interface UseWorkoutPlaybackResult {
  playback: WorkoutPlaybackState
  currentStep: WorkoutPlaybackStep | null
  canGoPrevious: boolean
  canGoNext: boolean
  stepNavigationEnabled: boolean
  progressRatio: number
  start: () => void
  pause: () => void
  resume: () => void
  goToPreviousStep: (expected: ExpectedStepNavigation) => void
  goToNextStep: (expected: ExpectedStepNavigation) => void
  restart: () => void
}

function getStepDurationSeconds(steps: readonly WorkoutPlaybackStep[], index: number): number {
  return steps[index]?.durationSeconds ?? 0
}

function buildInitialPlaybackState(steps: readonly WorkoutPlaybackStep[], stepRevision: number): WorkoutPlaybackState {
  if (steps.length === 0) {
    return {
      status: 'completed',
      currentStepIndex: 0,
      remainingSeconds: 0,
      stepRevision,
    }
  }

  return {
    status: 'idle',
    currentStepIndex: 0,
    remainingSeconds: getStepDurationSeconds(steps, 0),
    stepRevision,
  }
}

function playbackStatesEqual(left: WorkoutPlaybackState, right: WorkoutPlaybackState): boolean {
  return (
    left.status === right.status &&
    left.currentStepIndex === right.currentStepIndex &&
    left.remainingSeconds === right.remainingSeconds &&
    left.stepRevision === right.stepRevision
  )
}

function shouldBumpStepRevision(previous: WorkoutPlaybackState, next: WorkoutPlaybackState): boolean {
  return (
    next.currentStepIndex !== previous.currentStepIndex ||
    (next.status === 'completed' && previous.status !== 'completed')
  )
}

function withStepRevision(previous: WorkoutPlaybackState, next: WorkoutPlaybackState, bumpRevision: boolean): WorkoutPlaybackState {
  return {
    ...next,
    stepRevision: bumpRevision ? previous.stepRevision + 1 : previous.stepRevision,
  }
}

function matchesExpectedStepNavigation(
  playback: WorkoutPlaybackState,
  expected: ExpectedStepNavigation,
): boolean {
  return (
    playback.currentStepIndex === expected.expectedStepIndex &&
    playback.stepRevision === expected.expectedStepRevision
  )
}

export function useWorkoutPlayback(timeline: WorkoutPlaybackTimeline): UseWorkoutPlaybackResult {
  const stepsRef = useRef(timeline.steps)

  const playbackRef = useRef<WorkoutPlaybackState>(buildInitialPlaybackState(stepsRef.current, INITIAL_STEP_REVISION))
  const [playback, setPlayback] = useState<WorkoutPlaybackState>(() => playbackRef.current)

  const deadlineRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const generationRef = useRef(0)

  const invalidateRuntime = useCallback(() => {
    generationRef.current += 1
  }, [])

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const commitPlayback = useCallback((nextPlayback: WorkoutPlaybackState, nextDeadlineMs: number | null) => {
    playbackRef.current = nextPlayback
    deadlineRef.current = nextDeadlineMs
    setPlayback(nextPlayback)
  }, [])

  const commitPlaybackTransition = useCallback(
    (previousPlayback: WorkoutPlaybackState, nextPlayback: WorkoutPlaybackState, nextDeadlineMs: number | null) => {
      const bumpRevision = shouldBumpStepRevision(previousPlayback, nextPlayback)
      commitPlayback(withStepRevision(previousPlayback, nextPlayback, bumpRevision), nextDeadlineMs)
    },
    [commitPlayback],
  )

  useEffect(() => {
    return () => {
      invalidateRuntime()
      clearTimer()
      deadlineRef.current = null
    }
  }, [clearTimer, invalidateRuntime])

  const runTick = useCallback(() => {
    const current = playbackRef.current

    if (current.status !== 'running') {
      return
    }

    const deadlineMs = deadlineRef.current
    if (deadlineMs === null) {
      return
    }

    const resolved = resolveRunningPlaybackAtTime(current, deadlineMs, Date.now(), stepsRef.current)
    const bumpRevision = shouldBumpStepRevision(current, resolved.playback)

    if (bumpRevision || !playbackStatesEqual(current, resolved.playback)) {
      commitPlaybackTransition(current, resolved.playback, resolved.deadlineMs)
    }
  }, [commitPlaybackTransition])

  useEffect(() => {
    if (playback.status !== 'running') {
      clearTimer()
      return
    }

    const generation = generationRef.current
    clearTimer()
    intervalRef.current = setInterval(() => {
      if (generationRef.current !== generation) {
        return
      }

      runTick()
    }, TICK_INTERVAL_MS)

    return () => {
      clearTimer()
    }
  }, [playback.status, clearTimer, runTick])

  const start = useCallback(() => {
    const current = playbackRef.current

    if (current.status !== 'idle') {
      return
    }

    if (stepsRef.current.length === 0) {
      invalidateRuntime()
      commitPlaybackTransition(
        current,
        {
          status: 'completed',
          currentStepIndex: 0,
          remainingSeconds: 0,
          stepRevision: current.stepRevision,
        },
        null,
      )
      return
    }

    const durationSeconds = getStepDurationSeconds(stepsRef.current, current.currentStepIndex)
    const nowMs = Date.now()

    commitPlayback(
      {
        status: 'running',
        currentStepIndex: current.currentStepIndex,
        remainingSeconds: durationSeconds,
        stepRevision: current.stepRevision,
      },
      nowMs + durationSeconds * 1000,
    )
  }, [commitPlayback, commitPlaybackTransition, invalidateRuntime])

  const pause = useCallback(() => {
    const current = playbackRef.current

    if (current.status !== 'running') {
      return
    }

    const deadlineMs = deadlineRef.current
    if (deadlineMs === null) {
      commitPlayback(
        {
          ...current,
          status: 'paused',
        },
        null,
      )
      return
    }

    const nowMs = Date.now()
    const resolved = resolveRunningPlaybackAtTime(current, deadlineMs, nowMs, stepsRef.current)

    if (resolved.playback.status === 'completed') {
      invalidateRuntime()
      commitPlaybackTransition(current, resolved.playback, null)
      return
    }

    const remainingSeconds = Math.max(1, Math.ceil((resolved.deadlineMs! - nowMs) / 1000))
    const bumpRevision = shouldBumpStepRevision(current, resolved.playback)

    commitPlayback(
      withStepRevision(current, {
        status: 'paused',
        currentStepIndex: resolved.playback.currentStepIndex,
        remainingSeconds,
        stepRevision: current.stepRevision,
      }, bumpRevision),
      null,
    )
  }, [commitPlayback, commitPlaybackTransition, invalidateRuntime])

  const resume = useCallback(() => {
    const current = playbackRef.current

    if (current.status !== 'paused') {
      return
    }

    const nowMs = Date.now()

    commitPlayback(
      {
        status: 'running',
        currentStepIndex: current.currentStepIndex,
        remainingSeconds: current.remainingSeconds,
        stepRevision: current.stepRevision,
      },
      nowMs + current.remainingSeconds * 1000,
    )
  }, [commitPlayback])

  const goToPreviousStep = useCallback(
    (expected: ExpectedStepNavigation) => {
      let current = playbackRef.current

      if (current.status === 'running' && deadlineRef.current !== null) {
        const resolved = resolveRunningPlaybackAtTime(
          current,
          deadlineRef.current,
          Date.now(),
          stepsRef.current,
        )
        current = resolved.playback

        if (current.status === 'completed') {
          invalidateRuntime()
          commitPlaybackTransition(playbackRef.current, current, null)
          return
        }
      }

      if (
        current.status === 'idle' ||
        current.status === 'completed' ||
        current.currentStepIndex === 0 ||
        !matchesExpectedStepNavigation(current, expected)
      ) {
        return
      }

      const previousIndex = current.currentStepIndex - 1
      const durationSeconds = getStepDurationSeconds(stepsRef.current, previousIndex)
      const nextStatus: WorkoutPlaybackStatus = current.status === 'running' ? 'running' : 'paused'
      const nowMs = Date.now()
      const nextDeadlineMs = nextStatus === 'running' ? nowMs + durationSeconds * 1000 : null

      commitPlaybackTransition(
        current,
        {
          status: nextStatus,
          currentStepIndex: previousIndex,
          remainingSeconds: durationSeconds,
          stepRevision: current.stepRevision,
        },
        nextDeadlineMs,
      )
    },
    [commitPlaybackTransition, invalidateRuntime],
  )

  const goToNextStep = useCallback(
    (expected: ExpectedStepNavigation) => {
      const current = playbackRef.current

      if (current.status === 'idle' || current.status === 'completed') {
        return
      }

      let resolvedPlayback = current
      let resolvedDeadlineMs = deadlineRef.current

      if (current.status === 'running' && resolvedDeadlineMs !== null) {
        const resolved = resolveRunningPlaybackAtTime(
          current,
          resolvedDeadlineMs,
          Date.now(),
          stepsRef.current,
        )
        resolvedPlayback = resolved.playback
        resolvedDeadlineMs = resolved.deadlineMs

        if (resolvedPlayback.status === 'completed') {
          invalidateRuntime()
          commitPlaybackTransition(current, resolvedPlayback, null)
          return
        }
      }

      if (!matchesExpectedStepNavigation(resolvedPlayback, expected)) {
        return
      }

      const nextIndex = resolvedPlayback.currentStepIndex + 1

      if (nextIndex >= stepsRef.current.length) {
        invalidateRuntime()
        commitPlaybackTransition(
          resolvedPlayback,
          {
            status: 'completed',
            currentStepIndex: resolvedPlayback.currentStepIndex,
            remainingSeconds: 0,
            stepRevision: resolvedPlayback.stepRevision,
          },
          null,
        )
        return
      }

      const durationSeconds = getStepDurationSeconds(stepsRef.current, nextIndex)
      const nextStatus: WorkoutPlaybackStatus =
        resolvedPlayback.status === 'running' ? 'running' : 'paused'
      const nowMs = Date.now()
      const nextDeadlineMs = nextStatus === 'running' ? nowMs + durationSeconds * 1000 : null

      commitPlaybackTransition(
        resolvedPlayback,
        {
          status: nextStatus,
          currentStepIndex: nextIndex,
          remainingSeconds: durationSeconds,
          stepRevision: resolvedPlayback.stepRevision,
        },
        nextDeadlineMs,
      )
    },
    [commitPlaybackTransition, invalidateRuntime],
  )

  const restart = useCallback(() => {
    invalidateRuntime()
    clearTimer()
    deadlineRef.current = null

    const current = playbackRef.current

    if (stepsRef.current.length === 0) {
      commitPlayback(
        withStepRevision(
          current,
          {
            status: 'completed',
            currentStepIndex: 0,
            remainingSeconds: 0,
            stepRevision: current.stepRevision,
          },
          true,
        ),
        null,
      )
      return
    }

    commitPlayback(
      withStepRevision(
        current,
        {
          status: 'idle',
          currentStepIndex: 0,
          remainingSeconds: getStepDurationSeconds(stepsRef.current, 0),
          stepRevision: current.stepRevision,
        },
        true,
      ),
      null,
    )
  }, [clearTimer, commitPlayback, invalidateRuntime])

  const currentStep = stepsRef.current[playback.currentStepIndex] ?? null
  const stepNavigationEnabled = playback.status === 'running' || playback.status === 'paused'
  const canGoPrevious = stepNavigationEnabled && playback.currentStepIndex > 0
  const canGoNext = stepNavigationEnabled
  const progressRatio =
    stepsRef.current.length === 0 ? 1 : (playback.currentStepIndex + 1) / stepsRef.current.length

  return {
    playback,
    currentStep,
    canGoPrevious,
    canGoNext,
    stepNavigationEnabled,
    progressRatio,
    start,
    pause,
    resume,
    goToPreviousStep,
    goToNextStep,
    restart,
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  ExpectedStepNavigation,
  WorkoutPlaybackState,
  WorkoutPlaybackStatus,
  WorkoutPlaybackStep,
  WorkoutPlaybackTimeline,
} from '@/features/workout-player/types/workoutPlayback.types'
import type {
  WorkoutPlaybackEvent,
  WorkoutPlaybackStepFinalizeReason,
} from '@/features/workout-player/types/workoutPlaybackEvents.types'
import { resolveRunningPlaybackAtTime } from '@/features/workout-player/utils/resolveRunningPlaybackAtTime'
import {
  calculatePerformedDurationSeconds,
  deriveStepOutcome,
} from '@/features/workout-player/utils/workoutPlaybackStepOutcome'

const TICK_INTERVAL_MS = 250
const INITIAL_STEP_REVISION = 1

interface UseWorkoutPlaybackOptions {
  onPlaybackEvent?: (event: WorkoutPlaybackEvent) => void
}

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

function emitStepFinalized(
  emit: (event: WorkoutPlaybackEvent) => void,
  steps: readonly WorkoutPlaybackStep[],
  stepIndex: number,
  remainingSeconds: number,
  reason: WorkoutPlaybackStepFinalizeReason,
): void {
  const step = steps[stepIndex]

  if (!step) {
    return
  }

  const performedDurationSeconds = calculatePerformedDurationSeconds(
    step.durationSeconds,
    remainingSeconds,
    reason,
  )
  const outcome = deriveStepOutcome(step.durationSeconds, performedDurationSeconds, reason)

  emit({
    type: 'stepFinalized',
    stepIndex,
    playbackStepId: step.id,
    performedDurationSeconds,
    outcome,
    reason,
  })
}

function emitElapsedTransitions(
  previous: WorkoutPlaybackState,
  next: WorkoutPlaybackState,
  steps: readonly WorkoutPlaybackStep[],
  nowMs: number,
  emit: (event: WorkoutPlaybackEvent) => void,
): void {
  const prevIndex = previous.currentStepIndex
  const nextIndex = next.currentStepIndex

  if (next.status === 'completed' && previous.status !== 'completed') {
    if (nextIndex > prevIndex) {
      for (let stepIndex = prevIndex; stepIndex < nextIndex; stepIndex += 1) {
        emitStepFinalized(emit, steps, stepIndex, 0, 'elapsed')
      }
    }

    emitStepFinalized(emit, steps, nextIndex, 0, 'elapsed')
    emit({ type: 'completed', timestampMs: nowMs })
    return
  }

  if (nextIndex > prevIndex) {
    for (let stepIndex = prevIndex; stepIndex < nextIndex; stepIndex += 1) {
      emitStepFinalized(emit, steps, stepIndex, 0, 'elapsed')
    }
  }
}

export function useWorkoutPlayback(
  timeline: WorkoutPlaybackTimeline,
  options?: UseWorkoutPlaybackOptions,
): UseWorkoutPlaybackResult {
  const stepsRef = useRef(timeline.steps)
  const onPlaybackEventRef = useRef(options?.onPlaybackEvent)

  onPlaybackEventRef.current = options?.onPlaybackEvent

  const playbackRef = useRef<WorkoutPlaybackState>(buildInitialPlaybackState(stepsRef.current, INITIAL_STEP_REVISION))
  const [playback, setPlayback] = useState<WorkoutPlaybackState>(() => playbackRef.current)

  const deadlineRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const generationRef = useRef(0)

  const emitEvent = useCallback((event: WorkoutPlaybackEvent) => {
    onPlaybackEventRef.current?.(event)
  }, [])

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

    const nowMs = Date.now()
    const resolved = resolveRunningPlaybackAtTime(current, deadlineMs, nowMs, stepsRef.current)
    const bumpRevision = shouldBumpStepRevision(current, resolved.playback)

    emitElapsedTransitions(current, resolved.playback, stepsRef.current, nowMs, emitEvent)

    if (bumpRevision || !playbackStatesEqual(current, resolved.playback)) {
      commitPlaybackTransition(current, resolved.playback, resolved.deadlineMs)
    }
  }, [commitPlaybackTransition, emitEvent])

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

    const nowMs = Date.now()
    emitEvent({ type: 'started', timestampMs: nowMs })

    const durationSeconds = getStepDurationSeconds(stepsRef.current, current.currentStepIndex)

    commitPlayback(
      {
        status: 'running',
        currentStepIndex: current.currentStepIndex,
        remainingSeconds: durationSeconds,
        stepRevision: current.stepRevision,
      },
      nowMs + durationSeconds * 1000,
    )
  }, [commitPlayback, commitPlaybackTransition, emitEvent, invalidateRuntime])

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

    emitElapsedTransitions(current, resolved.playback, stepsRef.current, nowMs, emitEvent)

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
  }, [commitPlayback, commitPlaybackTransition, emitEvent, invalidateRuntime])

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
      const nowMs = Date.now()
      const capturedGeneration = generationRef.current
      const snapshot = playbackRef.current

      if (
        snapshot.status === 'idle' ||
        snapshot.status === 'completed' ||
        snapshot.currentStepIndex === 0
      ) {
        return
      }

      if (!matchesExpectedStepNavigation(snapshot, expected)) {
        return
      }

      if (snapshot.status === 'running' && deadlineRef.current !== null) {
        const resolved = resolveRunningPlaybackAtTime(
          snapshot,
          deadlineRef.current,
          nowMs,
          stepsRef.current,
        )

        if (generationRef.current !== capturedGeneration) {
          return
        }

        if (playbackRef.current !== snapshot) {
          return
        }

        if (resolved.playback.status === 'completed') {
          invalidateRuntime()
        }

        commitPlaybackTransition(snapshot, resolved.playback, resolved.deadlineMs)
        emitElapsedTransitions(snapshot, resolved.playback, stepsRef.current, nowMs, emitEvent)

        if (resolved.playback.status === 'completed') {
          return
        }

        const reconciled = playbackRef.current

        if (
          reconciled.currentStepIndex !== expected.expectedStepIndex ||
          reconciled.stepRevision !== expected.expectedStepRevision
        ) {
          return
        }
      }

      const current = playbackRef.current

      if (!matchesExpectedStepNavigation(current, expected)) {
        return
      }

      emitStepFinalized(
        emitEvent,
        stepsRef.current,
        current.currentStepIndex,
        current.remainingSeconds,
        'previous',
      )

      const previousIndex = current.currentStepIndex - 1
      const durationSeconds = getStepDurationSeconds(stepsRef.current, previousIndex)
      const nextStatus: WorkoutPlaybackStatus = current.status === 'running' ? 'running' : 'paused'
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
    [commitPlaybackTransition, emitEvent, invalidateRuntime],
  )

  const goToNextStep = useCallback(
    (expected: ExpectedStepNavigation) => {
      const nowMs = Date.now()
      const capturedGeneration = generationRef.current
      const snapshot = playbackRef.current

      if (snapshot.status === 'idle' || snapshot.status === 'completed') {
        return
      }

      if (!matchesExpectedStepNavigation(snapshot, expected)) {
        return
      }

      if (snapshot.status === 'running' && deadlineRef.current !== null) {
        const resolved = resolveRunningPlaybackAtTime(
          snapshot,
          deadlineRef.current,
          nowMs,
          stepsRef.current,
        )

        if (generationRef.current !== capturedGeneration) {
          return
        }

        if (playbackRef.current !== snapshot) {
          return
        }

        if (resolved.playback.status === 'completed') {
          invalidateRuntime()
        }

        commitPlaybackTransition(snapshot, resolved.playback, resolved.deadlineMs)
        emitElapsedTransitions(snapshot, resolved.playback, stepsRef.current, nowMs, emitEvent)

        if (resolved.playback.status === 'completed') {
          return
        }

        const reconciled = playbackRef.current

        if (
          reconciled.currentStepIndex !== expected.expectedStepIndex ||
          reconciled.stepRevision !== expected.expectedStepRevision
        ) {
          return
        }
      }

      const current = playbackRef.current

      if (!matchesExpectedStepNavigation(current, expected)) {
        return
      }

      emitStepFinalized(
        emitEvent,
        stepsRef.current,
        current.currentStepIndex,
        current.remainingSeconds,
        'next',
      )

      const nextIndex = current.currentStepIndex + 1

      if (nextIndex >= stepsRef.current.length) {
        invalidateRuntime()
        commitPlaybackTransition(
          current,
          {
            status: 'completed',
            currentStepIndex: current.currentStepIndex,
            remainingSeconds: 0,
            stepRevision: current.stepRevision,
          },
          null,
        )
        emitEvent({ type: 'completed', timestampMs: nowMs })
        return
      }

      const durationSeconds = getStepDurationSeconds(stepsRef.current, nextIndex)
      const nextStatus: WorkoutPlaybackStatus = current.status === 'running' ? 'running' : 'paused'
      const nextDeadlineMs = nextStatus === 'running' ? nowMs + durationSeconds * 1000 : null

      commitPlaybackTransition(
        current,
        {
          status: nextStatus,
          currentStepIndex: nextIndex,
          remainingSeconds: durationSeconds,
          stepRevision: current.stepRevision,
        },
        nextDeadlineMs,
      )
    },
    [commitPlaybackTransition, emitEvent, invalidateRuntime],
  )

  const restart = useCallback(() => {
    emitEvent({ type: 'restarted' })

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
  }, [clearTimer, commitPlayback, emitEvent, invalidateRuntime])

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

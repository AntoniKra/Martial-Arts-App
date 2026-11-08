import { useCallback, useEffect, useRef, useState } from 'react'
import type { ActiveWorkout } from '@/application/workout/activeWorkoutRepository'

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
import {
  getResumeDeadlineMs,
  pauseRunningStep,
  type PausedPlayback,
} from '@/features/workout-player/utils/playbackPause'
import { choosePreviousStepAction, getElapsedInStepMs } from '@/features/workout-player/utils/previousStepAction'
import { resolveRunningPlaybackAtTime } from '@/features/workout-player/utils/resolveRunningPlaybackAtTime'
import { resolveWorkoutPreparation } from '@/features/workout-player/utils/resolveWorkoutPreparation'
import { WORKOUT_PREPARATION_DEFAULT, type WorkoutPreparation } from '@/features/workout-player/workoutPreparation'
import { finalizePlaybackSteps, getNextWorkoutItemStepIndex } from '@/features/workout-player/utils/finishPlaybackSteps'
import {
  calculatePerformedDurationSeconds,
  deriveStepOutcome,
} from '@/features/workout-player/utils/workoutPlaybackStepOutcome'

const TICK_INTERVAL_MS = 250
const INITIAL_STEP_REVISION = 1

interface UseWorkoutPlaybackOptions {
  onPlaybackEvent?: (event: WorkoutPlaybackEvent) => void
  preparation?: WorkoutPreparation
  initialWorkout?: ActiveWorkout
}

interface UseWorkoutPlaybackResult {
  playback: WorkoutPlaybackState
  currentStep: WorkoutPlaybackStep | null
  canGoPrevious: boolean
  canGoNext: boolean
  stepNavigationEnabled: boolean
  progressRatio: number
  start: () => void
  startNow: () => void
  pause: () => void
  resume: () => void
  goToPreviousStep: (expected: ExpectedStepNavigation) => void
  goToNextStep: (expected: ExpectedStepNavigation) => void
  finishCurrentExercise: (expected: ExpectedStepNavigation) => void
  endEarly: () => void
  restart: () => void
  getPlaybackSnapshot: () => Pick<ActiveWorkout, 'playback' | 'deadlineMs' | 'pausedRemainingMs'>
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
    (previous.status === 'preparing' && next.status !== 'preparing') ||
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
  performedDurationMs?: number,
): void {
  const step = steps[stepIndex]

  if (!step) {
    return
  }

  const performedDurationSeconds = calculatePerformedDurationSeconds(
    step.durationSeconds,
    remainingSeconds,
    reason,
    step.kind,
  )
  const outcome = deriveStepOutcome(step.durationSeconds, performedDurationSeconds, reason, step.kind)

  emit({
    type: 'stepFinalized',
    stepIndex,
    playbackStepId: step.id,
    performedDurationSeconds,
    // Manual navigation supplies real elapsed milliseconds even when the exercise is skipped.
    performedDurationMs: performedDurationMs ?? performedDurationSeconds * 1000,
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
  const preparationSeconds = Number(options?.preparation ?? WORKOUT_PREPARATION_DEFAULT)
  const onPlaybackEventRef = useRef(options?.onPlaybackEvent)

  useEffect(() => { onPlaybackEventRef.current = options?.onPlaybackEvent }, [options?.onPlaybackEvent])

  const playbackRef = useRef<WorkoutPlaybackState>(options?.initialWorkout?.playback ?? buildInitialPlaybackState(timeline.steps, INITIAL_STEP_REVISION))
  const [playback, setPlayback] = useState<WorkoutPlaybackState>(() => options?.initialWorkout?.playback ?? buildInitialPlaybackState(timeline.steps, INITIAL_STEP_REVISION))

  const deadlineRef = useRef<number | null>(options?.initialWorkout?.deadlineMs ?? null)
  const pausedPlaybackRef = useRef<PausedPlayback | null>(options?.initialWorkout?.playback.status === 'paused'
    ? { playback: options.initialWorkout.playback, remainingMs: options.initialWorkout.pausedRemainingMs ?? options.initialWorkout.playback.remainingSeconds * 1000 } : null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const generationRef = useRef(0)
  const getPlaybackSnapshot = useCallback(() => ({
    playback: playbackRef.current,
    deadlineMs: deadlineRef.current,
    pausedRemainingMs: playbackRef.current.status === 'paused'
      ? getResumeDeadlineMs(playbackRef.current, pausedPlaybackRef.current, 0) : null,
  }), [])

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
    }
  }, [clearTimer, invalidateRuntime])

  const runTick = useCallback((startNow = false) => {
    const current = playbackRef.current

    if (current.status !== 'running' && current.status !== 'preparing') {
      return
    }

    const deadlineMs = deadlineRef.current
    if (deadlineMs === null) {
      return
    }

    const nowMs = Date.now()
    if (current.status === 'preparing') {
      const resolved = resolveWorkoutPreparation(current, deadlineMs, nowMs, stepsRef.current, startNow)
      if (resolved.startedAtMs !== null) {
        emitEvent({ type: 'started', timestampMs: resolved.startedAtMs })
        emitElapsedTransitions({ ...current, status: 'running' }, resolved.playback, stepsRef.current, nowMs, emitEvent)
      }
      if (!playbackStatesEqual(current, resolved.playback)) {
        commitPlaybackTransition(current, resolved.playback, resolved.deadlineMs)
      }
      return
    }
    const resolved = resolveRunningPlaybackAtTime(current, deadlineMs, nowMs, stepsRef.current)
    const bumpRevision = shouldBumpStepRevision(current, resolved.playback)

    emitElapsedTransitions(current, resolved.playback, stepsRef.current, nowMs, emitEvent)

    if (bumpRevision || !playbackStatesEqual(current, resolved.playback)) {
      commitPlaybackTransition(current, resolved.playback, resolved.deadlineMs)
    }
  }, [commitPlaybackTransition, emitEvent])

  useEffect(() => {
    if (playback.status !== 'running' && playback.status !== 'preparing') {
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

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') runTick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [runTick])

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

    commitPlayback(
      {
        status: 'preparing',
        currentStepIndex: current.currentStepIndex,
        remainingSeconds: preparationSeconds,
        stepRevision: current.stepRevision,
      },
      nowMs + preparationSeconds * 1000,
    )
  }, [commitPlayback, commitPlaybackTransition, invalidateRuntime, preparationSeconds])

  const startNow = useCallback(() => {
    if (playbackRef.current.status === 'preparing') runTick(true)
  }, [runTick])

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

    // Not reachable in practice: a step that has not completed always has a deadline.
    if (resolved.deadlineMs === null) {
      return
    }

    const paused = pauseRunningStep(resolved.playback, resolved.deadlineMs, nowMs)
    const bumpRevision = shouldBumpStepRevision(current, resolved.playback)
    const pausedPlayback = withStepRevision(current, paused.playback, bumpRevision)

    pausedPlaybackRef.current = { playback: pausedPlayback, remainingMs: paused.remainingMs }
    commitPlayback(pausedPlayback, null)
  }, [commitPlayback, commitPlaybackTransition, emitEvent, invalidateRuntime])

  const resume = useCallback(() => {
    const current = playbackRef.current

    if (current.status !== 'paused') {
      return
    }

    const nowMs = Date.now()
    const deadlineMs = getResumeDeadlineMs(current, pausedPlaybackRef.current, nowMs)

    pausedPlaybackRef.current = null
    commitPlayback(
      {
        status: 'running',
        currentStepIndex: current.currentStepIndex,
        remainingSeconds: current.remainingSeconds,
        stepRevision: current.stepRevision,
      },
      deadlineMs,
    )
  }, [commitPlayback])

  const goToPreviousStep = useCallback(
    (expected: ExpectedStepNavigation) => {
      const nowMs = Date.now()
      const capturedGeneration = generationRef.current
      const snapshot = playbackRef.current

      if (snapshot.status !== 'running' && snapshot.status !== 'paused') {
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

      const elapsedMs = getElapsedInStepMs(
        current,
        getStepDurationSeconds(stepsRef.current, current.currentStepIndex),
        deadlineRef.current,
        pausedPlaybackRef.current,
        nowMs,
      )
      const action = choosePreviousStepAction(current.currentStepIndex, elapsedMs)

      // A restarted attempt is recorded like going back: the step keeps its best result.
      emitStepFinalized(
        emitEvent,
        stepsRef.current,
        current.currentStepIndex,
        current.remainingSeconds,
        'previous',
        elapsedMs,
      )

      const targetIndex = action === 'restartCurrent' ? current.currentStepIndex : current.currentStepIndex - 1
      const durationSeconds = getStepDurationSeconds(stepsRef.current, targetIndex)
      const nextStatus: WorkoutPlaybackStatus = current.status === 'running' ? 'running' : 'paused'
      const nextDeadlineMs = nextStatus === 'running' ? nowMs + durationSeconds * 1000 : null
      const nextPlayback: WorkoutPlaybackState = {
        status: nextStatus,
        currentStepIndex: targetIndex,
        remainingSeconds: durationSeconds,
        stepRevision: current.stepRevision,
      }

      // A restart keeps the index, so bump the revision explicitly to drop clicks aimed at the old attempt.
      commitPlayback(withStepRevision(current, nextPlayback, true), nextDeadlineMs)
    },
    [commitPlayback, commitPlaybackTransition, emitEvent, invalidateRuntime],
  )

  const advancePlayback = useCallback(
    (expected: ExpectedStepNavigation, reason: 'next' | 'finishExercise' | 'endEarly') => {
      const nowMs = Date.now()
      const capturedGeneration = generationRef.current
      const snapshot = playbackRef.current

      if (snapshot.status !== 'running' && snapshot.status !== 'paused') {
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

      if (reason === 'finishExercise' && stepsRef.current[current.currentStepIndex]?.kind === 'break') return

      const nextIndex = reason === 'endEarly'
        ? stepsRef.current.length
        : reason === 'finishExercise'
          ? getNextWorkoutItemStepIndex(stepsRef.current, current.currentStepIndex)
          : current.currentStepIndex + 1

      const events = finalizePlaybackSteps(
        stepsRef.current,
        current.currentStepIndex,
        nextIndex,
        current.remainingSeconds,
        getElapsedInStepMs(
          current,
          getStepDurationSeconds(stepsRef.current, current.currentStepIndex),
          deadlineRef.current,
          pausedPlaybackRef.current,
          nowMs,
        ),
        reason,
      )
      events.forEach(emitEvent)

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
        emitEvent({ type: 'completed', timestampMs: nowMs, endedEarly: reason === 'endEarly' })
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

  const goToNextStep = useCallback((expected: ExpectedStepNavigation) => advancePlayback(expected, 'next'), [advancePlayback])
  const finishCurrentExercise = useCallback((expected: ExpectedStepNavigation) => advancePlayback(expected, 'finishExercise'), [advancePlayback])
  const endEarly = useCallback(() => {
    const current = playbackRef.current
    advancePlayback({ expectedStepIndex: current.currentStepIndex, expectedStepRevision: current.stepRevision }, 'endEarly')
  }, [advancePlayback])

  const restart = useCallback(() => {
    emitEvent({ type: 'restarted' })

    invalidateRuntime()
    clearTimer()
    deadlineRef.current = null
    pausedPlaybackRef.current = null

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
          status: 'preparing',
          currentStepIndex: 0,
          remainingSeconds: preparationSeconds,
          stepRevision: current.stepRevision,
        },
        true,
      ),
      Date.now() + preparationSeconds * 1000,
    )
  }, [clearTimer, commitPlayback, emitEvent, invalidateRuntime, preparationSeconds])

  const currentStep = timeline.steps[playback.currentStepIndex] ?? null
  const stepNavigationEnabled = playback.status === 'running' || playback.status === 'paused'
  // On the first step "Poprzedni" restarts it, so it is available whenever navigation is.
  const canGoPrevious = stepNavigationEnabled
  const canGoNext = stepNavigationEnabled
  const progressRatio =
    timeline.steps.length === 0 ? 1 : (playback.currentStepIndex + 1) / timeline.steps.length

  return {
    playback,
    currentStep,
    canGoPrevious,
    canGoNext,
    stepNavigationEnabled,
    progressRatio,
    start,
    startNow,
    pause,
    resume,
    goToPreviousStep,
    goToNextStep,
    finishCurrentExercise,
    endEarly,
    restart,
    getPlaybackSnapshot,
  }
}

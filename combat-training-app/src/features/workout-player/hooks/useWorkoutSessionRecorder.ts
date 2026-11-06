import { useCallback, useRef, useState } from 'react'

import type { WorkoutSession, WorkoutSessionStepOutcome } from '@/domain/workout-session/workoutSession.types'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import {
  calculateWorkoutSessionDurations,
  createPlanWorkoutSession,
  type PlanWorkoutSessionResult,
  type WorkoutSessionAttempt,
} from '@/domain/workout-session/workoutSessionDefinitions'
import { mapPlaybackStepToSessionStepResult } from '@/features/workout-player/mappers/mapPlaybackStepToSessionStepResult'
import type { WorkoutPlaybackTimeline } from '@/features/workout-player/types/workoutPlayback.types'
import type { WorkoutPlaybackEvent } from '@/features/workout-player/types/workoutPlaybackEvents.types'
import { workoutPlayerLabels } from '@/features/workout-player/workoutPlayerLabels'
import {
  mergeTrackedStepResult,
  type TrackedStepResult,
} from '@/features/workout-player/utils/mergeTrackedStepResult'

export const WORKOUT_SESSION_RECORDER_ERROR_MESSAGE = workoutPlayerLabels.recorderError
export const WORKOUT_SESSION_NO_WORK_MESSAGE = workoutPlayerLabels.noWork

interface UseWorkoutSessionRecorderResult {
  onPlaybackEvent: (event: WorkoutPlaybackEvent) => void
  completedSession: WorkoutSession | null
  runGeneration: number
  hasRecorderError: boolean
  hasNoWork: boolean
  endedEarly: boolean
}

export function useWorkoutSessionRecorder(
  plan: WorkoutPlan,
  timeline: WorkoutPlaybackTimeline,
): UseWorkoutSessionRecorderResult {
  const sessionIdRef = useRef<string | null>(null)
  const startedAtRef = useRef<string | null>(null)
  const stepResultsRef = useRef<Map<string, TrackedStepResult>>(new Map())
  const attemptsRef = useRef<WorkoutSessionAttempt[]>([])
  const isFinalizedRef = useRef(false)
  const runGenerationRef = useRef(0)
  const [runGeneration, setRunGeneration] = useState(0)
  const [completedSession, setCompletedSession] = useState<WorkoutSession | null>(null)
  const [hasRecorderError, setHasRecorderError] = useState(false)
  const [hasNoWork, setHasNoWork] = useState(false)
  const [endedEarly, setEndedEarly] = useState(false)

  const resetRecorder = useCallback(() => {
    sessionIdRef.current = null
    startedAtRef.current = null
    stepResultsRef.current = new Map()
    attemptsRef.current = []
    isFinalizedRef.current = false
    runGenerationRef.current += 1
    setRunGeneration(runGenerationRef.current)
    setCompletedSession(null)
    setHasRecorderError(false)
    setHasNoWork(false)
    setEndedEarly(false)
  }, [])

  const recordStepResult = useCallback(
    (
      stepIndex: number,
      playbackStepId: string,
      performedDurationSeconds: number,
      performedDurationMs: number,
      outcome: WorkoutSessionStepOutcome,
    ) => {
      const step = timeline.steps[stepIndex]

      if (!step || step.id !== playbackStepId) {
        return
      }

      attemptsRef.current.push({ kind: step.kind, blockType: step.blockType, performedDurationMs, outcome })

      const incoming: TrackedStepResult = {
        stepIndex,
        playbackStepId,
        plannedDurationSeconds: step.durationSeconds,
        performedDurationSeconds,
        outcome,
      }

      const existing = stepResultsRef.current.get(playbackStepId)
      stepResultsRef.current.set(playbackStepId, mergeTrackedStepResult(existing, incoming))
    },
    [timeline.steps],
  )

  const buildCompletedSession = useCallback(
    (completedAtMs: number, endedEarly: boolean): PlanWorkoutSessionResult | null => {
      const sessionId = sessionIdRef.current
      const startedAt = startedAtRef.current

      if (sessionId === null || startedAt === null || timeline.steps.length === 0) {
        return null
      }

      const stepResults = timeline.steps.map((step) => {
        const tracked = stepResultsRef.current.get(step.id)

        if (tracked === undefined) {
          throw new Error('Workout session recorder is missing a step result.')
        }

        return mapPlaybackStepToSessionStepResult(
          step,
          tracked.performedDurationSeconds,
          tracked.outcome,
        )
      })

      return createPlanWorkoutSession({
        id: sessionId,
        workoutPlanId: plan.id,
        workoutPlanNameSnapshot: plan.nameSnapshot,
        disciplineKey: plan.disciplineKey,
        startedAt,
        completedAt: new Date(completedAtMs).toISOString(),
        stepResults,
        note: null,
      }, {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        blockTypes: plan.blocks.map((block) => block.blockType),
        endedEarly,
        durations: calculateWorkoutSessionDurations(attemptsRef.current),
      })
    },
    [plan, timeline.steps],
  )

  const onPlaybackEvent = useCallback(
    (event: WorkoutPlaybackEvent) => {
      if (event.type === 'restarted') {
        resetRecorder()
        return
      }

      if (isFinalizedRef.current) {
        return
      }

      switch (event.type) {
        case 'started':
          if (sessionIdRef.current !== null) {
            return
          }

          sessionIdRef.current = crypto.randomUUID()
          startedAtRef.current = new Date(event.timestampMs).toISOString()
          return

        case 'stepFinalized':
          if (sessionIdRef.current === null) {
            return
          }

          recordStepResult(
            event.stepIndex,
            event.playbackStepId,
            event.performedDurationSeconds,
            event.performedDurationMs,
            event.outcome,
          )
          return

        case 'completed':
          if (sessionIdRef.current === null) {
            return
          }

          try {
            setEndedEarly(event.endedEarly === true)
            const result = buildCompletedSession(event.timestampMs, event.endedEarly === true)

            if (result === null) {
              isFinalizedRef.current = true
              setHasRecorderError(true)
              return
            }

            isFinalizedRef.current = true
            if (result.kind === 'noWork') {
              setHasNoWork(true)
            } else {
              setCompletedSession(result.session)
            }
          } catch {
            isFinalizedRef.current = true
            setHasRecorderError(true)
          }
          return
      }
    },
    [buildCompletedSession, recordStepResult, resetRecorder],
  )

  return {
    onPlaybackEvent,
    completedSession,
    runGeneration,
    hasRecorderError,
    hasNoWork,
    endedEarly,
  }
}

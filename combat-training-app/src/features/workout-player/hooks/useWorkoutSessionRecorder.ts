import type { TrackedStepResult } from '@/domain/workout-playback/workoutPlayback.types'
import { useCallback, useRef, useState } from 'react'
import type { WorkoutSessionRecording } from '@/application/workout/activeWorkoutRepository'
import { buildRecordedWorkoutSession } from '../utils/workoutSessionRecording'

import type { WorkoutSession, WorkoutSessionStepOutcome } from '@/domain/workout-session/workoutSession.types'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import { createWorkoutFocusRatings } from '@/domain/workout-session/workoutFocusRatings'
import {
  type RecordedWorkoutSessionResult,
  type WorkoutSessionAttempt,
} from '@/domain/workout-session/workoutSessionDefinitions'
import type { WorkoutPlaybackTimeline } from '@/domain/workout-playback/workoutPlayback.types'
import type { WorkoutPlaybackEvent } from '@/features/workout-player/types/workoutPlaybackEvents.types'
import { workoutPlayerLabels } from '@/features/workout-player/workoutPlayerLabels'
import {
  mergeTrackedStepResult,
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
  getRecording: () => WorkoutSessionRecording
}

export function useWorkoutSessionRecorder(
  plan: WorkoutPlan,
  timeline: WorkoutPlaybackTimeline,
  initial?: WorkoutSessionRecording,
  focusSkills: readonly FocusSkill[] = [],
  source: 'plan' | 'quickTimer' = 'plan',
): UseWorkoutSessionRecorderResult {
  const sessionIdRef = useRef<string | null>(initial?.sessionId ?? null)
  const timezoneRef = useRef(initial?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
  const startedAtRef = useRef<string | null>(initial?.startedAt ?? null)
  const stepResultsRef = useRef<Map<string, TrackedStepResult>>(new Map(initial?.stepResults.map((result) => [result.playbackStepId, result])))
  const attemptsRef = useRef<WorkoutSessionAttempt[]>(initial?.attempts ?? [])
  const completedAtRef = useRef<number | null>(initial?.completedAt ?? null)
  const [initialRatings] = useState(() => ({ exerciseRatings: initial?.exerciseRatings ?? [],
    focusRatings: initial?.focusRatings ?? createWorkoutFocusRatings(plan.blocks, focusSkills) }))
  const ratingsRef = useRef(initialRatings)
  const endedEarlyRef = useRef(initial?.endedEarly ?? false)
  const isFinalizedRef = useRef(initial?.completedAt !== null && initial?.completedAt !== undefined)
  const runGenerationRef = useRef(0)
  const [runGeneration, setRunGeneration] = useState(0)
  const [completedSession, setCompletedSession] = useState<WorkoutSession | null>(() => {
    if (!initial || initial.completedAt === null) return null
    const result = buildRecordedWorkoutSession(plan, timeline.steps, initial, initial.completedAt, initial.endedEarly, source)
    return result.kind === 'save' ? result.session : null
  })
  const [hasRecorderError, setHasRecorderError] = useState(false)
  const [hasNoWork, setHasNoWork] = useState(() => !!initial && initial.completedAt !== null
    && buildRecordedWorkoutSession(plan, timeline.steps, initial, initial.completedAt, initial.endedEarly, source).kind === 'noWork')
  const [endedEarly, setEndedEarly] = useState(initial?.endedEarly ?? false)

  const getRecording = useCallback((): WorkoutSessionRecording => ({
    timezone: timezoneRef.current,
    sessionId: sessionIdRef.current, startedAt: startedAtRef.current,
    stepResults: [...stepResultsRef.current.values()], attempts: [...attemptsRef.current],
    ...ratingsRef.current, completedAt: completedAtRef.current, endedEarly: endedEarlyRef.current,
  }), [])

  const resetRecorder = useCallback(() => {
    sessionIdRef.current = null
    timezoneRef.current = Intl.DateTimeFormat().resolvedOptions().timeZone
    startedAtRef.current = null
    stepResultsRef.current = new Map()
    attemptsRef.current = []
    isFinalizedRef.current = false
    completedAtRef.current = null
    endedEarlyRef.current = false
    ratingsRef.current = { exerciseRatings: [], focusRatings: createWorkoutFocusRatings(plan.blocks, focusSkills) }
    runGenerationRef.current += 1
    setRunGeneration(runGenerationRef.current)
    setCompletedSession(null)
    setHasRecorderError(false)
    setHasNoWork(false)
    setEndedEarly(false)
  }, [plan.blocks, focusSkills])

  const recordStepResult = useCallback(
    (
      stepIndex: number,
      playbackStepId: string,
      performedDurationSeconds: number,
      performedDurationMs: number,
      outcome: WorkoutSessionStepOutcome,
      plannedDurationSeconds?: number,
    ) => {
      const step = timeline.steps[stepIndex]

      if (!step || step.id !== playbackStepId) {
        return
      }

      attemptsRef.current.push({ kind: step.kind, blockType: step.blockType, performedDurationMs, outcome })

      const incoming: TrackedStepResult = {
        stepIndex,
        playbackStepId,
        plannedDurationSeconds: plannedDurationSeconds ?? step.durationSeconds,
        performedDurationSeconds,
        outcome,
      }

      const existing = stepResultsRef.current.get(playbackStepId)
      stepResultsRef.current.set(playbackStepId, mergeTrackedStepResult(existing, incoming))
    },
    [timeline.steps],
  )

  const buildCompletedSession = useCallback(
    (completedAtMs: number, endedEarly: boolean): RecordedWorkoutSessionResult | null => {
      if (!sessionIdRef.current || !startedAtRef.current || timeline.steps.length === 0) return null
      if (timeline.steps.some((step) => !stepResultsRef.current.has(step.id))) {
        throw new Error('Workout session recorder is missing a step result.')
      }
      return buildRecordedWorkoutSession(plan, timeline.steps, getRecording(), completedAtMs, endedEarly, source)
    },
    [plan, timeline.steps, getRecording, source],
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
            event.plannedDurationSeconds,
          )
          return

        case 'completed':
          if (sessionIdRef.current === null) {
            return
          }

          try {
            completedAtRef.current = event.timestampMs
            endedEarlyRef.current = event.endedEarly === true
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
    getRecording,
  }
}

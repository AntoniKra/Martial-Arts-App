import { useCallback, useEffect, useRef, useState } from 'react'

import { mapWorkoutSessionSaveError } from '@/app/mapWorkoutSessionSaveError'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'

export type WorkoutSessionSaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved' }
  | { status: 'error'; message: string }

interface UseWorkoutSessionAutoSaveOptions {
  completedSession: WorkoutSession | null
  runGeneration: number
  saveWorkoutSession: (session: WorkoutSession) => Promise<void>
}

interface UseWorkoutSessionAutoSaveResult {
  saveState: WorkoutSessionSaveState
  retrySave: () => void
}

export function useWorkoutSessionAutoSave({
  completedSession,
  runGeneration,
  saveWorkoutSession,
}: UseWorkoutSessionAutoSaveOptions): UseWorkoutSessionAutoSaveResult {
  const [saveState, setSaveState] = useState<WorkoutSessionSaveState>({ status: 'idle' })
  const isMountedRef = useRef(true)
  const activeRunGenerationRef = useRef(runGeneration)
  const previousRunGenerationRef = useRef(runGeneration)
  const saveInFlightSessionIdRef = useRef<string | null>(null)
  const savedSessionIdRef = useRef<string | null>(null)
  const pendingSessionRef = useRef<WorkoutSession | null>(null)

  activeRunGenerationRef.current = runGeneration

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (previousRunGenerationRef.current === runGeneration) {
      return
    }

    previousRunGenerationRef.current = runGeneration
    saveInFlightSessionIdRef.current = null
    savedSessionIdRef.current = null
    pendingSessionRef.current = null
    setSaveState({ status: 'idle' })
  }, [runGeneration])

  const performSave = useCallback(
    (session: WorkoutSession, captureGeneration: number) => {
      if (saveInFlightSessionIdRef.current === session.id) {
        return
      }

      saveInFlightSessionIdRef.current = session.id
      setSaveState({ status: 'saving' })

      void Promise.resolve()
        .then(() => saveWorkoutSession(session))
        .then(() => {
          if (!isMountedRef.current || activeRunGenerationRef.current !== captureGeneration) {
            return
          }

          savedSessionIdRef.current = session.id

          if (saveInFlightSessionIdRef.current === session.id) {
            saveInFlightSessionIdRef.current = null
          }

          setSaveState({ status: 'saved' })
        })
        .catch((error) => {
          if (!isMountedRef.current || activeRunGenerationRef.current !== captureGeneration) {
            return
          }

          if (saveInFlightSessionIdRef.current === session.id) {
            saveInFlightSessionIdRef.current = null
          }

          setSaveState({
            status: 'error',
            message: mapWorkoutSessionSaveError(error),
          })
        })
    },
    [saveWorkoutSession],
  )

  useEffect(() => {
    if (completedSession === null) {
      return
    }

    if (savedSessionIdRef.current === completedSession.id) {
      return
    }

    if (saveInFlightSessionIdRef.current === completedSession.id) {
      return
    }

    pendingSessionRef.current = completedSession
    performSave(completedSession, activeRunGenerationRef.current)
  }, [completedSession, performSave])

  const retrySave = useCallback(() => {
    if (saveState.status === 'saving') {
      return
    }

    const session = pendingSessionRef.current

    if (session === null || saveState.status !== 'error') {
      return
    }

    performSave(session, activeRunGenerationRef.current)
  }, [performSave, saveState.status])

  return {
    saveState,
    retrySave,
  }
}

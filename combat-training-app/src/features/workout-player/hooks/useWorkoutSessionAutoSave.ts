import { useEffect, useRef, useState } from 'react'
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

export function useWorkoutSessionAutoSave({ completedSession, runGeneration, saveWorkoutSession }: UseWorkoutSessionAutoSaveOptions) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ id: string; generation: number; state: WorkoutSessionSaveState } | null>(null)
  const taskRef = useRef<{ id: string; attempt: number; promise: Promise<void> } | null>(null)
  useEffect(() => {
    if (!completedSession) return
    let cancelled = false
    // Reuse the operation when StrictMode resubscribes; stale completions cannot affect a new run.
    if (taskRef.current?.id !== completedSession.id || taskRef.current.attempt !== attempt) {
      taskRef.current = { id: completedSession.id, attempt,
        promise: Promise.resolve().then(() => saveWorkoutSession(completedSession)) }
    }
    void taskRef.current.promise.then(() => {
      if (!cancelled) setResult({ id: completedSession.id, generation: runGeneration, state: { status: 'saved' } })
    }, (error: unknown) => {
      if (!cancelled) setResult({ id: completedSession.id, generation: runGeneration,
        state: { status: 'error', message: mapWorkoutSessionSaveError(error) } })
    })
    return () => { cancelled = true }
  }, [completedSession, runGeneration, saveWorkoutSession, attempt])
  const saveState: WorkoutSessionSaveState = !completedSession ? { status: 'idle' }
    : result?.id === completedSession.id && result.generation === runGeneration ? result.state : { status: 'saving' }
  function retrySave() {
    if (!completedSession || saveState.status !== 'error') return
    setResult(null)
    setAttempt((value) => value + 1)
  }
  return { saveState, retrySave }
}

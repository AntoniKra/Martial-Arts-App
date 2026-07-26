import { useCallback, useEffect, useRef, useState } from 'react'

import { createWorkoutPlanRepository } from '@/app/createWorkoutPlanRepository'
import { createWorkoutSessionRepository } from '@/app/createWorkoutSessionRepository'
import { mapWorkoutPlanListLoadError } from '@/app/mapWorkoutPlanListLoadError'
import { mapWorkoutSessionListLoadError } from '@/app/mapWorkoutSessionListLoadError'
import { WorkoutsView } from '@/features/workouts/components/WorkoutsView'
import { mapWorkoutPlansToListItems } from '@/features/workouts/mappers/workoutPlanListItemMapper'
import { mapWorkoutSessionsToHistoryListItems } from '@/features/workouts/mappers/workoutSessionHistoryListItemMapper'
import type {
  WorkoutHistoryListItem,
  WorkoutHistoryLoadState,
  WorkoutHistoryMutationResult,
  WorkoutPlansLoadState,
} from '@/features/workouts/types/workoutsView.types'
import { normalizeWorkoutHistoryNote } from '@/features/workouts/utils/normalizeWorkoutHistoryNote'

export function WorkoutsPage() {
  const [workoutPlanRepository] = useState(createWorkoutPlanRepository)
  const [workoutSessionRepository] = useState(createWorkoutSessionRepository)
  const [plansLoadState, setPlansLoadState] = useState<WorkoutPlansLoadState>({ status: 'loading' })
  const [historyLoadState, setHistoryLoadState] = useState<WorkoutHistoryLoadState>({ status: 'loading' })
  const [plansReloadCounter, setPlansReloadCounter] = useState(0)
  const [historyReloadCounter, setHistoryReloadCounter] = useState(0)
  const isMountedRef = useRef(false)
  const historyLoadStateRef = useRef<WorkoutHistoryLoadState>({ status: 'loading' })
  const reloadGenerationRef = useRef(0)
  const listRequestTokenRef = useRef(0)
  const sessionMutationTokensRef = useRef(new Map<string, number>())

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  const applyHistoryLoadState = useCallback((nextState: WorkoutHistoryLoadState) => {
    historyLoadStateRef.current = nextState

    if (!isMountedRef.current) {
      return
    }

    setHistoryLoadState(nextState)
  }, [])

  const beginSessionMutation = useCallback((sessionId: string) => {
    const mutationToken = (sessionMutationTokensRef.current.get(sessionId) ?? 0) + 1
    sessionMutationTokensRef.current.set(sessionId, mutationToken)

    return {
      mutationToken,
      reloadGenerationAtMutationStart: reloadGenerationRef.current,
    }
  }, [])

  const shouldApplySessionMutation = useCallback(
    (
      sessionId: string,
      mutationToken: number,
      reloadGenerationAtMutationStart: number,
    ): boolean => {
      return (
        isMountedRef.current &&
        sessionMutationTokensRef.current.get(sessionId) === mutationToken &&
        reloadGenerationRef.current === reloadGenerationAtMutationStart
      )
    },
    [],
  )

  const tryApplyHistoryMutation = useCallback(
    (
      sessionId: string,
      mutationToken: number,
      reloadGenerationAtMutationStart: number,
      updater: (sessions: WorkoutHistoryListItem[]) => WorkoutHistoryListItem[],
    ): WorkoutHistoryMutationResult => {
      if (!shouldApplySessionMutation(sessionId, mutationToken, reloadGenerationAtMutationStart)) {
        return 'stale'
      }

      const currentState = historyLoadStateRef.current

      if (currentState.status !== 'success') {
        return 'stale'
      }

      const nextState: WorkoutHistoryLoadState = {
        status: 'success',
        sessions: updater(currentState.sessions),
      }

      listRequestTokenRef.current += 1
      applyHistoryLoadState(nextState)

      return 'applied'
    },
    [applyHistoryLoadState, shouldApplySessionMutation],
  )

  const loadPlans = useCallback(async (isCancelled: () => boolean) => {
    setPlansLoadState({ status: 'loading' })

    try {
      const plans = await workoutPlanRepository.list()

      if (isCancelled()) {
        return
      }

      setPlansLoadState({
        status: 'success',
        plans: mapWorkoutPlansToListItems(plans),
      })
    } catch (error) {
      if (isCancelled()) {
        return
      }

      setPlansLoadState({
        status: 'error',
        message: mapWorkoutPlanListLoadError(error),
      })
    }
  }, [workoutPlanRepository])

  const loadHistory = useCallback(async (isCancelled: () => boolean) => {
    reloadGenerationRef.current += 1
    const reloadGenerationAtStart = reloadGenerationRef.current

    const listRequestToken = listRequestTokenRef.current + 1
    listRequestTokenRef.current = listRequestToken

    applyHistoryLoadState({ status: 'loading' })

    try {
      const sessions = await workoutSessionRepository.list()

      if (
        isCancelled() ||
        listRequestToken !== listRequestTokenRef.current ||
        reloadGenerationAtStart !== reloadGenerationRef.current
      ) {
        return
      }

      applyHistoryLoadState({
        status: 'success',
        sessions: mapWorkoutSessionsToHistoryListItems(sessions),
      })
    } catch (error) {
      if (
        isCancelled() ||
        listRequestToken !== listRequestTokenRef.current ||
        reloadGenerationAtStart !== reloadGenerationRef.current
      ) {
        return
      }

      applyHistoryLoadState({
        status: 'error',
        message: mapWorkoutSessionListLoadError(error),
      })
    }
  }, [applyHistoryLoadState, workoutSessionRepository])

  useEffect(() => {
    let cancelled = false

    void loadPlans(() => cancelled)

    return () => {
      cancelled = true
    }
  }, [loadPlans, plansReloadCounter])

  useEffect(() => {
    let cancelled = false

    void loadHistory(() => cancelled)

    return () => {
      cancelled = true
    }
  }, [loadHistory, historyReloadCounter])

  const handleUpdateSessionNote = useCallback(
    async (sessionId: string, note: string): Promise<WorkoutHistoryMutationResult> => {
      const { mutationToken, reloadGenerationAtMutationStart } = beginSessionMutation(sessionId)
      const normalizedNote = normalizeWorkoutHistoryNote(note)

      try {
        const updated = await workoutSessionRepository.updateNote(sessionId, normalizedNote)

        if (!updated) {
          throw new Error('Session not found.')
        }
      } catch {
        if (!shouldApplySessionMutation(sessionId, mutationToken, reloadGenerationAtMutationStart)) {
          return 'stale'
        }

        throw new Error('Failed to update session note.')
      }

      return tryApplyHistoryMutation(sessionId, mutationToken, reloadGenerationAtMutationStart, (sessions) =>
        sessions.map((session) =>
          session.id === sessionId ? { ...session, note: normalizedNote } : session,
        ),
      )
    },
    [
      beginSessionMutation,
      shouldApplySessionMutation,
      tryApplyHistoryMutation,
      workoutSessionRepository,
    ],
  )

  const handleDeleteSession = useCallback(
    async (sessionId: string): Promise<WorkoutHistoryMutationResult> => {
      const { mutationToken, reloadGenerationAtMutationStart } = beginSessionMutation(sessionId)

      try {
        const deleted = await workoutSessionRepository.delete(sessionId)

        if (!deleted) {
          throw new Error('Session not found.')
        }
      } catch {
        if (!shouldApplySessionMutation(sessionId, mutationToken, reloadGenerationAtMutationStart)) {
          return 'stale'
        }

        throw new Error('Failed to delete session.')
      }

      return tryApplyHistoryMutation(sessionId, mutationToken, reloadGenerationAtMutationStart, (sessions) =>
        sessions.filter((session) => session.id !== sessionId),
      )
    },
    [
      beginSessionMutation,
      shouldApplySessionMutation,
      tryApplyHistoryMutation,
      workoutSessionRepository,
    ],
  )

  function handleRetryLoadPlans(): void {
    setPlansReloadCounter((current) => current + 1)
  }

  function handleRetryLoadHistory(): void {
    setHistoryReloadCounter((current) => current + 1)
  }

  function handleHistoryActivated(): void {
    setHistoryReloadCounter((current) => current + 1)
  }

  return (
    <WorkoutsView
      plansLoadState={plansLoadState}
      historyLoadState={historyLoadState}
      onRetryLoadPlans={handleRetryLoadPlans}
      onRetryLoadHistory={handleRetryLoadHistory}
      onHistoryActivated={handleHistoryActivated}
      onUpdateSessionNote={handleUpdateSessionNote}
      onDeleteSession={handleDeleteSession}
    />
  )
}

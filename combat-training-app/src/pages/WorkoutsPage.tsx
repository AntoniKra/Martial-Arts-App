import { useCallback, useEffect, useState } from 'react'

import { createWorkoutPlanRepository } from '@/app/createWorkoutPlanRepository'
import { createWorkoutSessionRepository } from '@/app/createWorkoutSessionRepository'
import { mapWorkoutPlanListLoadError } from '@/app/mapWorkoutPlanListLoadError'
import { mapWorkoutSessionListLoadError } from '@/app/mapWorkoutSessionListLoadError'
import { WorkoutsView } from '@/features/workouts/components/WorkoutsView'
import { mapWorkoutPlansToListItems } from '@/features/workouts/mappers/workoutPlanListItemMapper'
import { mapWorkoutSessionsToHistoryListItems } from '@/features/workouts/mappers/workoutSessionHistoryListItemMapper'
import type {
  WorkoutHistoryLoadState,
  WorkoutPlansLoadState,
} from '@/features/workouts/types/workoutsView.types'

export function WorkoutsPage() {
  const [workoutPlanRepository] = useState(createWorkoutPlanRepository)
  const [workoutSessionRepository] = useState(createWorkoutSessionRepository)
  const [plansLoadState, setPlansLoadState] = useState<WorkoutPlansLoadState>({ status: 'loading' })
  const [historyLoadState, setHistoryLoadState] = useState<WorkoutHistoryLoadState>({ status: 'loading' })
  const [plansReloadCounter, setPlansReloadCounter] = useState(0)
  const [historyReloadCounter, setHistoryReloadCounter] = useState(0)

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
    setHistoryLoadState({ status: 'loading' })

    try {
      const sessions = await workoutSessionRepository.list()

      if (isCancelled()) {
        return
      }

      setHistoryLoadState({
        status: 'success',
        sessions: mapWorkoutSessionsToHistoryListItems(sessions),
      })
    } catch (error) {
      if (isCancelled()) {
        return
      }

      setHistoryLoadState({
        status: 'error',
        message: mapWorkoutSessionListLoadError(error),
      })
    }
  }, [workoutSessionRepository])

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
    />
  )
}

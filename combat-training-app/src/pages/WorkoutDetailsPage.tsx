import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { createWorkoutPlanRepository } from '@/app/createWorkoutPlanRepository'
import { mapWorkoutPlanReadError } from '@/app/mapWorkoutPlanReadError'
import { routes } from '@/app/routes'
import { WorkoutPlanDetailsView } from '@/features/workout-details/components/WorkoutPlanDetailsView'
import type { WorkoutPlanDetailsLoadState } from '@/features/workout-details/types/workoutPlanDetails.types'

export function WorkoutDetailsPage() {
  const { workoutId } = useParams()
  const resolvedWorkoutId = workoutId?.trim() ?? ''
  const [workoutPlanRepository] = useState(createWorkoutPlanRepository)
  const [loadState, setLoadState] = useState<WorkoutPlanDetailsLoadState>({ status: 'loading' })
  const [reloadCounter, setReloadCounter] = useState(0)

  const loadWorkoutPlan = useCallback(
    async (isCancelled: () => boolean) => {
      if (!resolvedWorkoutId) {
        setLoadState({ status: 'notFound' })
        return
      }

      setLoadState({ status: 'loading' })

      try {
        const plan = await workoutPlanRepository.getById(resolvedWorkoutId)

        if (isCancelled()) {
          return
        }

        if (plan === null) {
          setLoadState({ status: 'notFound' })
          return
        }

        setLoadState({ status: 'success', plan })
      } catch (error) {
        if (isCancelled()) {
          return
        }

        setLoadState({
          status: 'error',
          message: mapWorkoutPlanReadError(error),
        })
      }
    },
    [resolvedWorkoutId, workoutPlanRepository],
  )

  useEffect(() => {
    let cancelled = false

    void loadWorkoutPlan(() => cancelled)

    return () => {
      cancelled = true
    }
  }, [loadWorkoutPlan, reloadCounter])

  function handleRetry(): void {
    setReloadCounter((current) => current + 1)
  }

  return (
    <WorkoutPlanDetailsView
      loadState={loadState}
      workoutsListPath={routes.workouts}
      newWorkoutPath={routes.newWorkout}
      onRetry={handleRetry}
    />
  )
}

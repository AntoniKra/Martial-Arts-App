import { useCallback, useEffect, useState } from 'react'

import { createWorkoutPlanRepository } from '@/app/createWorkoutPlanRepository'
import { WorkoutsView } from '@/features/workouts/components/WorkoutsView'
import { workoutsMockData } from '@/features/workouts/data/workoutsMockData'
import { mapWorkoutPlansToListItems } from '@/features/workouts/mappers/workoutPlanListItemMapper'
import type { WorkoutPlansLoadState } from '@/features/workouts/types/workoutsView.types'
import { mapWorkoutPlanListLoadError } from '@/app/mapWorkoutPlanListLoadError'

export function WorkoutsPage() {
  const [workoutPlanRepository] = useState(createWorkoutPlanRepository)
  const [plansLoadState, setPlansLoadState] = useState<WorkoutPlansLoadState>({ status: 'loading' })
  const [reloadCounter, setReloadCounter] = useState(0)

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

  useEffect(() => {
    let cancelled = false

    void loadPlans(() => cancelled)

    return () => {
      cancelled = true
    }
  }, [loadPlans, reloadCounter])

  function handleRetryLoadPlans(): void {
    setReloadCounter((current) => current + 1)
  }

  return (
    <WorkoutsView
      plansLoadState={plansLoadState}
      history={workoutsMockData.history}
      onRetryLoadPlans={handleRetryLoadPlans}
    />
  )
}

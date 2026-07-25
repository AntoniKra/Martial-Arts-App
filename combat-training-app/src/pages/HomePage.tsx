import { useCallback, useEffect, useState } from 'react'

import { createWorkoutPlanRepository } from '@/app/createWorkoutPlanRepository'
import { mapWorkoutPlanListLoadError } from '@/app/mapWorkoutPlanListLoadError'
import { homeMockData } from '@/features/home/data/homeMockData'
import { HomeView } from '@/features/home/components/HomeView'
import { mapWorkoutPlanToFeaturedPlan } from '@/features/home/mappers/workoutPlanToFeaturedPlan'
import type { FeaturedWorkoutPlanLoadState } from '@/features/home/types/homeView.types'
import { selectLatestWorkoutPlan } from '@/features/home/utils/selectLatestWorkoutPlan'

export function HomePage() {
  const [workoutPlanRepository] = useState(createWorkoutPlanRepository)
  const [featuredPlanLoadState, setFeaturedPlanLoadState] = useState<FeaturedWorkoutPlanLoadState>({
    status: 'loading',
  })
  const [reloadCounter, setReloadCounter] = useState(0)

  const loadFeaturedPlan = useCallback(async (isCancelled: () => boolean) => {
    setFeaturedPlanLoadState({ status: 'loading' })

    try {
      const plans = await workoutPlanRepository.list()

      if (isCancelled()) {
        return
      }

      const latestPlan = selectLatestWorkoutPlan(plans)

      setFeaturedPlanLoadState({
        status: 'success',
        plan: latestPlan ? mapWorkoutPlanToFeaturedPlan(latestPlan) : null,
      })
    } catch (error) {
      if (isCancelled()) {
        return
      }

      setFeaturedPlanLoadState({
        status: 'error',
        message: mapWorkoutPlanListLoadError(error),
      })
    }
  }, [workoutPlanRepository])

  useEffect(() => {
    let cancelled = false

    void loadFeaturedPlan(() => cancelled)

    return () => {
      cancelled = true
    }
  }, [loadFeaturedPlan, reloadCounter])

  function handleRetryLoadFeaturedPlan(): void {
    setReloadCounter((current) => current + 1)
  }

  return (
    <HomeView
      sessionLabelPl={homeMockData.sessionLabelPl}
      featuredPlanLoadState={featuredPlanLoadState}
      recentSessions={homeMockData.recentSessions}
      onRetryLoadFeaturedPlan={handleRetryLoadFeaturedPlan}
    />
  )
}

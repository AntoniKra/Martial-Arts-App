import { useCallback, useEffect, useState } from 'react'

import { createWorkoutPlanRepository } from '@/app/createWorkoutPlanRepository'
import { createWorkoutSessionRepository } from '@/app/createWorkoutSessionRepository'
import { mapWorkoutPlanListLoadError } from '@/app/mapWorkoutPlanListLoadError'
import { mapWorkoutSessionListLoadError } from '@/app/mapWorkoutSessionListLoadError'
import { HomeView } from '@/features/home/components/HomeView'
import { mapWorkoutPlanToFeaturedPlan } from '@/features/home/mappers/workoutPlanToFeaturedPlan'
import { mapWorkoutSessionToHomeRecentSession } from '@/features/home/mappers/workoutSessionToHomeRecentSession'
import type {
  FeaturedWorkoutPlanLoadState,
  RecentWorkoutSessionsLoadState,
} from '@/features/home/types/homeView.types'
import { selectLatestWorkoutPlan } from '@/features/home/utils/selectLatestWorkoutPlan'
import { selectRecentWorkoutSessions } from '@/features/home/utils/selectRecentWorkoutSessions'

export function HomePage() {
  const [workoutPlanRepository] = useState(createWorkoutPlanRepository)
  const [workoutSessionRepository] = useState(createWorkoutSessionRepository)
  const [featuredPlanLoadState, setFeaturedPlanLoadState] = useState<FeaturedWorkoutPlanLoadState>({
    status: 'loading',
  })
  const [reloadCounter, setReloadCounter] = useState(0)
  const [recentSessionsLoadState, setRecentSessionsLoadState] = useState<RecentWorkoutSessionsLoadState>({
    status: 'loading',
  })
  const [sessionsReloadCounter, setSessionsReloadCounter] = useState(0)

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

  useEffect(() => {
    let cancelled = false

    void workoutSessionRepository.list()
      .then((sessions) => {
        if (cancelled) {
          return
        }

        setRecentSessionsLoadState({
          status: 'success',
          sessions: selectRecentWorkoutSessions(sessions).map(mapWorkoutSessionToHomeRecentSession),
        })
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setRecentSessionsLoadState({
          status: 'error',
          message: mapWorkoutSessionListLoadError(error),
        })
      })

    return () => {
      cancelled = true
    }
  }, [workoutSessionRepository, sessionsReloadCounter])

  function handleRetryLoadFeaturedPlan(): void {
    setReloadCounter((current) => current + 1)
  }

  function handleRetryLoadRecentSessions(): void {
    setRecentSessionsLoadState({ status: 'loading' })
    setSessionsReloadCounter((current) => current + 1)
  }

  return (
    <HomeView
      featuredPlanLoadState={featuredPlanLoadState}
      recentSessionsLoadState={recentSessionsLoadState}
      onRetryLoadFeaturedPlan={handleRetryLoadFeaturedPlan}
      onRetryLoadRecentSessions={handleRetryLoadRecentSessions}
    />
  )
}

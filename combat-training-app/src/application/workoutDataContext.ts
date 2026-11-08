import { workoutDataLabels } from '@/application/workoutDataLabels'
import { createContext, useContext } from 'react'
import type { WorkoutPlanRepository } from './workout/workoutPlanRepository'
import type { WorkoutSessionRepository } from './workout-session/workoutSessionRepository'
import type { CollectionState } from './useRepositoryCollection'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'

export interface WorkoutData {
  plans: CollectionState<WorkoutPlan>
  sessions: CollectionState<WorkoutSession>
  planRepository: WorkoutPlanRepository
  sessionRepository: WorkoutSessionRepository
  retry: () => void
}

export const WorkoutDataContext = createContext<WorkoutData | null>(null)

export function useWorkoutData(): WorkoutData {
  const data = useContext(WorkoutDataContext)
  if (!data) throw new Error('Missing workout data provider')
  return data
}

export function useWorkoutPlan(id: string) {
  const { plans, retry } = useWorkoutData()
  if (plans.status === 'loading') return { loadState: { status: 'loading' as const }, retry }
  if (plans.status === 'error') return { loadState: { status: 'error' as const, message: workoutDataLabels.planLoadError }, retry }
  const plan = plans.items.find((item) => item.id === id)
  return { loadState: plan ? { status: 'success' as const, plan } : { status: 'notFound' as const }, retry }
}

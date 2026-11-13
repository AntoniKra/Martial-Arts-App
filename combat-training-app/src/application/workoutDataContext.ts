import { workoutDataLabels } from '@/application/workoutDataLabels'
import { createContext, useContext } from 'react'
import type { WorkoutPlanRepository } from './workout/workoutPlanRepository'
import type { WorkoutSessionRepository } from './workout-session/workoutSessionRepository'
import type { CollectionState } from './useRepositoryCollection'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import type { FocusSkillRepository } from './focus-skill/focusSkillRepository'
import type { WeekPlanRepository } from './week-plan/weekPlanRepository'
import type { WeekPlanCollectionState } from './week-plan/useWeekPlanCollection'

export interface WorkoutData {
  weekPlans: WeekPlanCollectionState
  currentWeek: string
  weekPlanRepository: WeekPlanRepository
  retryWeekPlans: () => void
  retrySessions: () => void
  retryFocusSkills: () => void
  plans: CollectionState<WorkoutPlan>
  sessions: CollectionState<WorkoutSession>
  focusSkills: CollectionState<FocusSkill>
  planRepository: WorkoutPlanRepository
  sessionRepository: WorkoutSessionRepository
  focusSkillRepository: FocusSkillRepository
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

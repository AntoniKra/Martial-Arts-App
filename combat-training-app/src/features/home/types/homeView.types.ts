import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { WorkoutSessionStatus } from '@/domain/workout-session/workoutSession.types'

export interface HomeFeaturedPlan {
  id: string
  name: string
  disciplineKey: DisciplineKey
  goal: string
  blockCount: number
  exerciseCount: number
  roundCount: number
  estimatedDurationLabelPl: string
}

export interface HomeRecentSession {
  id: string
  status: WorkoutSessionStatus
  name: string
  disciplineKey: DisciplineKey
  dateLabelPl: string
  durationLabelPl: string
  completedExercises: number
  plannedExercises: number
  completedRounds: number | null
  plannedRounds: number | null
  exerciseCompletionPercent: number
  rpe: number | null
  averageRatingLabel: string | null
}

export type FeaturedWorkoutPlanLoadState =
  | { status: 'loading' }
  | { status: 'success'; plan: HomeFeaturedPlan | null }
  | { status: 'error'; message: string }

export type RecentWorkoutSessionsLoadState =
  | { status: 'loading' }
  | { status: 'success'; sessions: HomeRecentSession[] }
  | { status: 'error'; message: string }

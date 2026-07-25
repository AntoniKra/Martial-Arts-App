import type { DisciplineKey } from '@/domain/discipline/discipline.types'

export interface HomeFeaturedPlan {
  id: string
  name: string
  disciplineKey: DisciplineKey
  goal: string
  blockCount: number
  exerciseCount: number
  roundCount: number
  estimatedMinutes: number
}

export interface HomeRecentSession {
  id: string
  name: string
  disciplineKey: DisciplineKey
  dateLabelPl: string
  durationLabelPl: string
  exerciseCompletionPercent: number
  rpe: number | null
  averageRatingLabel: string | null
}

export type FeaturedWorkoutPlanLoadState =
  | { status: 'loading' }
  | { status: 'success'; plan: HomeFeaturedPlan | null }
  | { status: 'error'; message: string }

export interface HomeViewData {
  sessionLabelPl: string
  recentSessions: HomeRecentSession[]
}

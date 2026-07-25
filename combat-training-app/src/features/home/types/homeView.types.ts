import type { DisciplineKey } from '@/domain/discipline/discipline.types'

export interface HomeFeaturedPlan {
  id: string
  name: string
  disciplineKey: DisciplineKey
  goal: string
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

export interface HomeViewData {
  sessionLabelPl: string
  featuredPlan: HomeFeaturedPlan
  recentSessions: HomeRecentSession[]
}

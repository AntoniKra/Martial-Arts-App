import type { DisciplineKey } from '@/domain/discipline/discipline.types'

export type WorkoutsTab = 'plans' | 'history'

export type WorkoutsDisciplineFilter = 'all' | DisciplineKey

export type WorkoutsSortOrder = 'newest' | 'oldest'

export interface WorkoutsFilterState {
  searchQuery: string
  discipline: WorkoutsDisciplineFilter
  sortOrder: WorkoutsSortOrder
}

export interface WorkoutPlanListItem {
  id: string
  name: string
  disciplineKey: DisciplineKey
  goal: string | null
  exerciseCount: number
  roundCount: number
  estimatedMinutes: number
  createdAt: string
}

export interface WorkoutHistoryListItem {
  id: string
  name: string
  disciplineKey: DisciplineKey
  dateLabelPl: string
  completedAt: string
  durationLabelPl: string
  completedRounds: number
  plannedRounds: number
  exerciseCompletionPercent: number
  rpe: number | null
  averageRatingLabel: string | null
}

export interface WorkoutsViewData {
  plans: WorkoutPlanListItem[]
  history: WorkoutHistoryListItem[]
}

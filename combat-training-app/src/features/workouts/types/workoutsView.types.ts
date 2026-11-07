import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { WorkoutSessionStatus } from '@/domain/workout-session/workoutSession.types'

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
  estimatedDurationLabelPl: string
  createdAt: string
}

export type WorkoutHistoryMutationResult = 'applied' | 'stale'

export const WORKOUT_HISTORY_NOTE_MAX_LENGTH = 1000

export interface WorkoutHistoryListItem {
  id: string
  status: WorkoutSessionStatus
  name: string
  disciplineKey: DisciplineKey
  dateLabelPl: string
  timeLabelPl: string
  completedAt: string
  durationLabelPl: string
  completedExercises: number
  plannedExercises: number
  exerciseCompletionPercent: number
  completedRounds: number | null
  plannedRounds: number | null
  note: string | null
}

export type WorkoutPlansLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; plans: WorkoutPlanListItem[] }

export type WorkoutHistoryLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; sessions: WorkoutHistoryListItem[] }

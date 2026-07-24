import type { DisciplineKey } from '@/domain/discipline/discipline.types'

export type WorkoutStatus = 'draft' | 'planned' | 'in_progress' | 'completed'

export type WorkoutBlockType =
  | 'warm_up'
  | 'technique'
  | 'pads'
  | 'heavy_bag'
  | 'sparring'
  | 'conditioning'
  | 'strength_athletic'

export type ExerciseMode = 'rounds' | 'continuous' | 'strength'
export type WorkoutItemType = 'exercise' | 'break'

export interface RoundExerciseConfig {
  mode: 'rounds'
  rounds: number
  roundDurationSeconds: number
  restBetweenRoundsSeconds: number
}

export interface ContinuousExerciseConfig {
  mode: 'continuous'
  durationSeconds: number
}

export interface StrengthExerciseConfig {
  mode: 'strength'
  restBetweenSetsSeconds: number
}

export type ExerciseConfig = RoundExerciseConfig | ContinuousExerciseConfig | StrengthExerciseConfig

export interface WorkoutExercise {
  id: string
  type: 'exercise'
  position: number
  combinationId: string | null
  exerciseKey: string | null
  exerciseNameSnapshot: string
  instruction: string | null
  config: ExerciseConfig
  executionRating: number | null
}

export interface WorkoutBreak {
  id: string
  type: 'break'
  position: number
  durationSeconds: number
}

export type WorkoutItem = WorkoutExercise | WorkoutBreak

export interface WorkoutBlock {
  id: string
  type: WorkoutBlockType
  position: number
  items: WorkoutItem[]
}

export interface Workout {
  id: string
  status: WorkoutStatus
  disciplineKey: DisciplineKey
  customName: string | null
  nameSnapshot: string
  mainGoal: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  blocks: WorkoutBlock[]
}

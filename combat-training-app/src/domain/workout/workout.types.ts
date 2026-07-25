import type { DisciplineKey } from '@/domain/discipline/discipline.types'

export type WorkoutBlockType =
  | 'warmup'
  | 'technique'
  | 'pads'
  | 'bag'
  | 'sparring'
  | 'conditioning'
  | 'strengthAndConditioning'

export type ExerciseMode = 'rounds' | 'continuous' | 'strength'

export interface RoundExerciseConfiguration {
  mode: 'rounds'
  roundCount: number
  roundDurationSeconds: number
  restBetweenRoundsSeconds: number
}

export interface ContinuousExerciseConfiguration {
  mode: 'continuous'
  durationSeconds: number
}

// Strength configuration will join this union after sets, repetitions, and weight are modeled.
export type ExerciseConfiguration =
  | RoundExerciseConfiguration
  | ContinuousExerciseConfiguration

export interface WorkoutExercise {
  id: string
  type: 'exercise'
  combinationId: string | null
  exerciseNameSnapshot: string
  instruction: string | null
  configuration: ExerciseConfiguration
}

export interface WorkoutBreak {
  id: string
  type: 'break'
  durationSeconds: number
  instruction: string | null
}

export type WorkoutItem = WorkoutExercise | WorkoutBreak

export interface WorkoutBlock {
  id: string
  blockType: WorkoutBlockType
  items: WorkoutItem[]
}

interface WorkoutPlanSharedFields {
  id: string
  customName: string | null
  mainGoal: string | null
  blocks: WorkoutBlock[]
  createdAt: string
}

/** Editable builder state before an explicit save action. */
export interface WorkoutPlanDraft extends WorkoutPlanSharedFields {
  disciplineKey: DisciplineKey | null
}

/** Persisted, approved workout plan without execution/session fields. */
export interface WorkoutPlan extends WorkoutPlanSharedFields {
  disciplineKey: DisciplineKey
  nameSnapshot: string
}

import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { WorkoutBlockType } from '@/domain/workout/workout.types'

export type WorkoutSessionStepKind = 'exercise' | 'roundRest' | 'break'

export type WorkoutSessionStepOutcome = 'completed' | 'partial' | 'skipped'

export interface WorkoutSessionStepResult {
  playbackStepId: string
  workoutItemId: string
  blockId: string
  blockType: WorkoutBlockType
  kind: WorkoutSessionStepKind
  nameSnapshot: string
  roundNumber: number | null
  roundCount: number | null
  plannedDurationSeconds: number
  performedDurationSeconds: number
  outcome: WorkoutSessionStepOutcome
}

export type WorkoutSessionSource = 'plan' | 'quickTimer' | 'manual'

export type WorkoutSessionStatus = 'completed' | 'partial'

export type WorkoutSessionCategory = Exclude<WorkoutBlockType, 'warmup'> | 'mixed'

export interface WorkoutSessionCompletion {
  completedExercises: number
  plannedExercises: number
}

/** Persisted journal entry. A saved workout can be completed or partial. */
export interface WorkoutSession {
  id: string
  workoutPlanId: string
  workoutPlanNameSnapshot: string
  disciplineKey: DisciplineKey
  startedAt: string
  completedAt: string
  source: WorkoutSessionSource
  status: WorkoutSessionStatus
  durationSeconds: number
  workSeconds: number | null
  sparringSeconds: number | null
  /** null means not applicable (a future manual entry), never 100%. */
  completion: WorkoutSessionCompletion | null
  workoutDate: string
  timezone: string
  category: WorkoutSessionCategory
  stepResults: WorkoutSessionStepResult[]
  note: string | null
}

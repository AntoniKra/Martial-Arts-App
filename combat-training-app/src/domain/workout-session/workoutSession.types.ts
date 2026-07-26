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

/** Persisted completed workout session. Existence implies the workout was finished. */
export interface WorkoutSession {
  id: string
  workoutPlanId: string
  workoutPlanNameSnapshot: string
  disciplineKey: DisciplineKey
  startedAt: string
  completedAt: string
  stepResults: WorkoutSessionStepResult[]
  note: string | null
}

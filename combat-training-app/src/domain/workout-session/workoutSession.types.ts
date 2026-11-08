import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { SparringIntensity, WorkoutBlockType } from '@/domain/workout/workout.types'

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
  completed: number
  planned: number
  unit: 'exercise' | 'round'
}

export interface SparringEntry {
  blockId: string | null
  intensity: SparringIntensity | null
  rounds: number | null
}

export interface FocusRating {
  workoutItemId: string
  focusSkillId: string
  skillNameSnapshot: string
  criterionSnapshot: string
  blockType: WorkoutBlockType
  assessment: number | 'unableToRate' | null
  correction: { problem: string; fix: string } | null
  previousCorrectionCheck: 'better' | 'same' | 'notChecked' | null
}

export interface ExerciseRating {
  workoutItemId: string
  nameSnapshot: string
  blockType: WorkoutBlockType
  rating: number
}

interface WorkoutSessionFields {
  id: string
  disciplineKey: DisciplineKey
  category: WorkoutSessionCategory
  workoutDate: string
  timezone: string
  durationSeconds: number
  note: string | null
  rpe: number | null
  rpeRecordedAt: string | null
  sparring: SparringEntry[]
  createdAt: string
  updatedAt: string
}

interface TimedSessionFields extends WorkoutSessionFields {
  status: WorkoutSessionStatus
  startedAt: string
  completedAt: string
  workSeconds: number
  sparringSeconds: number
  stepResults: WorkoutSessionStepResult[]
}

export interface PlanWorkoutSession extends TimedSessionFields {
  source: 'plan'
  workoutPlanId: string
  workoutPlanNameSnapshot: string
  completion: WorkoutSessionCompletion & { unit: 'exercise' }
  focusRatings: FocusRating[]
  exerciseRatings: ExerciseRating[]
}

export interface QuickTimerWorkoutSession extends TimedSessionFields {
  source: 'quickTimer'
  completion: WorkoutSessionCompletion & { unit: 'round' }
}

export interface ManualWorkoutSession extends WorkoutSessionFields {
  source: 'manual'
  status: 'completed'
  workSeconds: number | null
  sparringSeconds: number | null
  completion: null
}

/** Persisted journal entry, discriminated by its source. */
export type WorkoutSession = PlanWorkoutSession | QuickTimerWorkoutSession | ManualWorkoutSession

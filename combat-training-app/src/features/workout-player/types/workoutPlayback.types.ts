import type { WorkoutBlockType, WorkoutPlan } from '@/domain/workout/workout.types'

export type WorkoutPlaybackStepKind = 'exercise' | 'roundRest' | 'break'

export type WorkoutPlaybackStatus = 'idle' | 'running' | 'paused' | 'completed'

export interface WorkoutPlaybackStep {
  id: string
  kind: WorkoutPlaybackStepKind
  durationSeconds: number
  blockIndex: number
  blockType: WorkoutBlockType
  itemId: string
  name: string
  instruction: string | null
  roundNumber: number | null
  roundCount: number | null
}

export interface WorkoutPlaybackTimeline {
  steps: WorkoutPlaybackStep[]
  totalDurationSeconds: number
  identity: string
}

export interface WorkoutPlaybackState {
  status: WorkoutPlaybackStatus
  currentStepIndex: number
  remainingSeconds: number
  stepRevision: number
}

export interface ExpectedStepNavigation {
  expectedStepIndex: number
  expectedStepRevision: number
}

export type WorkoutPlayerLoadState =
  | { status: 'loading' }
  | { status: 'success'; plan: WorkoutPlan }
  | { status: 'notFound' }
  | { status: 'error'; message: string }

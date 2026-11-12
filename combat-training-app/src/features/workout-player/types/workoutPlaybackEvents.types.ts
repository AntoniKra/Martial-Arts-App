import type { WorkoutSessionStepOutcome } from '@/domain/workout-session/workoutSession.types'

export type WorkoutPlaybackStepFinalizeReason = 'elapsed' | 'next' | 'previous' | 'finishExercise' | 'endEarly'

export type WorkoutPlaybackEvent =
  | {
      type: 'started'
      timestampMs: number
    }
  | {
      type: 'stepFinalized'
      stepIndex: number
      playbackStepId: string
      plannedDurationSeconds?: number
      performedDurationSeconds: number
      performedDurationMs: number
      outcome: WorkoutSessionStepOutcome
      reason: WorkoutPlaybackStepFinalizeReason
    }
  | {
      type: 'completed'
      timestampMs: number
      endedEarly?: boolean
    }
  | {
      type: 'restarted'
    }

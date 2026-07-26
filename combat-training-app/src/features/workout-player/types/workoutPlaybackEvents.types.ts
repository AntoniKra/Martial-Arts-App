import type { WorkoutSessionStepOutcome } from '@/domain/workout-session/workoutSession.types'

export type WorkoutPlaybackStepFinalizeReason = 'elapsed' | 'next' | 'previous'

export type WorkoutPlaybackEvent =
  | {
      type: 'started'
      timestampMs: number
    }
  | {
      type: 'stepFinalized'
      stepIndex: number
      playbackStepId: string
      performedDurationSeconds: number
      outcome: WorkoutSessionStepOutcome
      reason: WorkoutPlaybackStepFinalizeReason
    }
  | {
      type: 'completed'
      timestampMs: number
    }
  | {
      type: 'restarted'
    }

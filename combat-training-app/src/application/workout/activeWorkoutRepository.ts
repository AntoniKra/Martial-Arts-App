import type { WorkoutPlan } from '@/domain/workout/workout.types'
import type { ExerciseRating, FocusRating } from '@/domain/workout-session/workoutSession.types'
import type { WorkoutSessionAttempt } from '@/domain/workout-session/workoutSessionDefinitions'
import type { WorkoutPlaybackState } from '@/domain/workout-playback/workoutPlayback.types'
import type { TrackedStepResult } from '@/domain/workout-playback/workoutPlayback.types'

export interface WorkoutSessionRecording {
  timezone: string
  sessionId: string | null
  startedAt: string | null
  stepResults: TrackedStepResult[]
  attempts: WorkoutSessionAttempt[]
  exerciseRatings: ExerciseRating[]
  focusRatings: FocusRating[]
  completedAt: number | null
  endedEarly: boolean
}

export interface ActiveWorkout {
  schemaVersion: 1
  source?: 'plan' | 'quickTimer'
  plan: WorkoutPlan
  playback: WorkoutPlaybackState
  deadlineMs: number | null
  pausedRemainingMs: number | null
  stepDurations?: Record<string, number>
  recorder: WorkoutSessionRecording
  lastSeenAt: number
}

export interface ActiveWorkoutRepository {
  read(): ActiveWorkout | null
  save(workout: ActiveWorkout): void
  clear(): void
}

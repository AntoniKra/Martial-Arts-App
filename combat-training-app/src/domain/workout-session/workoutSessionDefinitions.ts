import type { WorkoutBlockType } from '@/domain/workout/workout.types'
import type {
  WorkoutSession,
  WorkoutSessionCategory,
  WorkoutSessionCompletion,
  WorkoutSessionStatus,
  WorkoutSessionStepResult,
} from '@/domain/workout-session/workoutSession.types'

export interface WorkoutSessionDurations {
  durationSeconds: number
  workSeconds: number
  sparringSeconds: number
}

/** Each attempt contributes time, even when a repeated step keeps only its best outcome. */
export interface WorkoutSessionAttempt {
  kind: WorkoutSessionStepResult['kind']
  blockType: WorkoutBlockType
  performedDurationMs: number
}

export function calculateWorkoutSessionDurations(attempts: readonly WorkoutSessionAttempt[]): WorkoutSessionDurations {
  let durationMs = 0
  let workMs = 0
  let sparringMs = 0

  for (const attempt of attempts) {
    durationMs += attempt.performedDurationMs
    if (attempt.kind === 'exercise') {
      workMs += attempt.performedDurationMs
      if (attempt.blockType === 'sparring') sparringMs += attempt.performedDurationMs
    }
  }

  // Keep fractional seconds: even a short attempt is work, with no minimum-time threshold.
  return {
    durationSeconds: durationMs / 1000,
    workSeconds: workMs / 1000,
    sparringSeconds: sparringMs / 1000,
  }
}

export function calculateWorkoutSessionCompletion(steps: readonly WorkoutSessionStepResult[]): WorkoutSessionCompletion {
  const exercises = new Map<string, boolean>()
  for (const step of steps) {
    if (step.kind !== 'exercise') continue
    exercises.set(step.workoutItemId, (exercises.get(step.workoutItemId) ?? true) && step.outcome === 'completed')
  }
  return {
    completedExercises: [...exercises.values()].filter(Boolean).length,
    plannedExercises: exercises.size,
  }
}

export function calculateWorkoutSessionStatus(
  steps: readonly WorkoutSessionStepResult[],
  endedEarly: boolean,
): WorkoutSessionStatus {
  return endedEarly || steps.some((step) => step.kind === 'exercise' && step.outcome !== 'completed')
    ? 'partial'
    : 'completed'
}

export function calculateWorkoutSessionCategory(blockTypes: readonly WorkoutBlockType[]): WorkoutSessionCategory {
  const types = new Set(blockTypes.filter((type) => type !== 'warmup'))
  return types.size === 1 ? [...types][0] : 'mixed'
}

export function calculateWorkoutDate(startedAt: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(startedAt))
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((value) => value.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

type PlanSessionFields = Pick<WorkoutSession,
  'id' | 'workoutPlanId' | 'workoutPlanNameSnapshot' | 'disciplineKey' |
  'startedAt' | 'completedAt' | 'stepResults' | 'note'>

interface PlanSessionOptions {
  timezone: string
  blockTypes: readonly WorkoutBlockType[]
  endedEarly: boolean
  durations: WorkoutSessionDurations
}

/** Also used by legacy migration, where only the best result of each step is available. */
export function definePlanWorkoutSession(fields: PlanSessionFields, options: PlanSessionOptions): WorkoutSession {
  return {
    ...fields,
    source: 'plan',
    status: calculateWorkoutSessionStatus(fields.stepResults, options.endedEarly),
    ...options.durations,
    completion: calculateWorkoutSessionCompletion(fields.stepResults),
    workoutDate: calculateWorkoutDate(fields.startedAt, options.timezone),
    timezone: options.timezone,
    category: calculateWorkoutSessionCategory(options.blockTypes),
  }
}

export type PlanWorkoutSessionResult =
  | { kind: 'save'; session: WorkoutSession }
  | { kind: 'noWork' }

export function createPlanWorkoutSession(fields: PlanSessionFields, options: PlanSessionOptions): PlanWorkoutSessionResult {
  if (options.durations.workSeconds === 0) return { kind: 'noWork' }
  return { kind: 'save', session: definePlanWorkoutSession(fields, options) }
}

import type { WorkoutBlock, WorkoutBlockType } from '@/domain/workout/workout.types'
import type {
  PlanWorkoutSession,
  SparringEntry,
  WorkoutSessionCategory,
  WorkoutSessionCompletion,
  WorkoutSessionStatus,
  WorkoutSessionStepOutcome,
  WorkoutSessionStepResult,
} from '@/domain/workout-session/workoutSession.types'

export interface WorkoutSessionDurations {
  durationSeconds: number
  workSeconds: number
  sparringSeconds: number
}

/** Every attempt adds duration; only completed exercise attempts add work. */
export interface WorkoutSessionAttempt {
  kind: WorkoutSessionStepResult['kind']
  blockType: WorkoutBlockType
  performedDurationMs: number
  outcome: WorkoutSessionStepOutcome
}

export function calculateWorkoutSessionDurations(attempts: readonly WorkoutSessionAttempt[]): WorkoutSessionDurations {
  let durationMs = 0
  let workMs = 0
  let sparringMs = 0

  for (const attempt of attempts) {
    durationMs += attempt.performedDurationMs
    if (attempt.kind === 'exercise' && attempt.outcome === 'completed') {
      workMs += attempt.performedDurationMs
      if (attempt.blockType === 'sparring') sparringMs += attempt.performedDurationMs
    }
  }

  // Keep the real duration of skipped attempts, including fractions of a second.
  return {
    durationSeconds: durationMs / 1000,
    workSeconds: workMs / 1000,
    sparringSeconds: sparringMs / 1000,
  }
}

export function calculateWorkoutSessionCompletion(steps: readonly WorkoutSessionStepResult[]): WorkoutSessionCompletion & { unit: 'exercise' } {
  const exercises = new Map<string, boolean>()
  for (const step of steps) {
    if (step.kind !== 'exercise') continue
    exercises.set(step.workoutItemId, (exercises.get(step.workoutItemId) ?? true) && step.outcome === 'completed')
  }
  return {
    completed: [...exercises.values()].filter(Boolean).length,
    planned: exercises.size,
    unit: 'exercise',
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

type PlanSessionFields = Pick<PlanWorkoutSession,
  'id' | 'workoutPlanId' | 'workoutPlanNameSnapshot' | 'disciplineKey' |
  'startedAt' | 'completedAt' | 'stepResults' | 'note'>

interface PlanSessionOptions {
  timezone: string
  blockTypes: readonly WorkoutBlockType[]
  endedEarly: boolean
  durations: WorkoutSessionDurations
  blocks?: readonly WorkoutBlock[]
}

export function calculateWorkoutSessionSparring(
  blocks: readonly WorkoutBlock[],
  steps: readonly WorkoutSessionStepResult[],
): SparringEntry[] {
  return blocks.filter((block) => block.blockType === 'sparring').map((block) => ({
    blockId: block.id,
    intensity: block.sparringIntensity,
    rounds: steps.filter((step) => step.blockId === block.id && step.kind === 'exercise'
      && step.roundNumber !== null && step.outcome === 'completed').length,
  }))
}

export function definePlanWorkoutSession(fields: PlanSessionFields, options: PlanSessionOptions): PlanWorkoutSession {
  return {
    ...fields,
    source: 'plan',
    status: calculateWorkoutSessionStatus(fields.stepResults, options.endedEarly),
    ...options.durations,
    completion: calculateWorkoutSessionCompletion(fields.stepResults),
    workoutDate: calculateWorkoutDate(fields.startedAt, options.timezone),
    timezone: options.timezone,
    category: calculateWorkoutSessionCategory(options.blockTypes),
    rpe: null,
    rpeRecordedAt: null,
    sparring: calculateWorkoutSessionSparring(options.blocks ?? [], fields.stepResults),
    focusRatings: [],
    exerciseRatings: [],
    createdAt: fields.completedAt,
    updatedAt: fields.completedAt,
  }
}

export type PlanWorkoutSessionResult =
  | { kind: 'save'; session: PlanWorkoutSession }
  | { kind: 'noWork' }

export function createPlanWorkoutSession(fields: PlanSessionFields, options: PlanSessionOptions): PlanWorkoutSessionResult {
  if (options.durations.workSeconds === 0) return { kind: 'noWork' }
  return { kind: 'save', session: definePlanWorkoutSession(fields, options) }
}

import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type {
  ExerciseConfiguration,
  WorkoutBlock,
  WorkoutBlockType,
  WorkoutBreak,
  WorkoutExercise,
  WorkoutItem,
  WorkoutPlan,
  WorkoutPlanDraft,
} from '@/domain/workout/workout.types'
import { validateWorkoutPlanDraft } from '@/domain/workout/workoutValidation'

export const WORKOUT_PLAN_STORAGE_SCHEMA_VERSION = 1 as const

export interface WorkoutPlanStorageEnvelopeV1 {
  schemaVersion: typeof WORKOUT_PLAN_STORAGE_SCHEMA_VERSION
  plans: WorkoutPlan[]
}

export type WorkoutPlanStorageErrorCode =
  | 'read_failed'
  | 'write_failed'
  | 'invalid_json'
  | 'invalid_data'
  | 'unsupported_schema_version'

export class WorkoutPlanStorageError extends Error {
  readonly code: WorkoutPlanStorageErrorCode

  constructor(code: WorkoutPlanStorageErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined)
    this.name = 'WorkoutPlanStorageError'
    this.code = code
  }
}

const DISCIPLINE_KEYS = new Set<DisciplineKey>([
  'boxing',
  'kickboxing',
  'muay_thai',
  'k1',
  'mma_striking',
])

const BLOCK_TYPES = new Set<WorkoutBlockType>([
  'warmup',
  'technique',
  'pads',
  'bag',
  'sparring',
  'conditioning',
  'strengthAndConditioning',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyTrimmedString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/** Accepts ISO 8601 timestamps emitted by `Date.prototype.toISOString()`. */
export function isValidStoredCreatedAt(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false
  }

  const timestamp = Date.parse(value)

  return Number.isFinite(timestamp)
}

function parseExerciseConfiguration(value: unknown): ExerciseConfiguration | null {
  if (!isRecord(value) || typeof value.mode !== 'string') {
    return null
  }

  if (value.mode === 'strength') {
    return null
  }

  if (value.mode === 'rounds') {
    if (
      !isPositiveSafeInteger(value.roundCount) ||
      !isPositiveSafeInteger(value.roundDurationSeconds) ||
      !isNonNegativeSafeInteger(value.restBetweenRoundsSeconds)
    ) {
      return null
    }

    return {
      mode: 'rounds',
      roundCount: value.roundCount,
      roundDurationSeconds: value.roundDurationSeconds,
      restBetweenRoundsSeconds: value.restBetweenRoundsSeconds,
    }
  }

  if (value.mode === 'continuous') {
    if (!isPositiveSafeInteger(value.durationSeconds)) {
      return null
    }

    return {
      mode: 'continuous',
      durationSeconds: value.durationSeconds,
    }
  }

  return null
}

function parseWorkoutExercise(value: unknown): WorkoutExercise | null {
  if (!isRecord(value) || value.type !== 'exercise') {
    return null
  }

  if (
    !isNonEmptyTrimmedString(value.id) ||
    !(value.combinationId === null || typeof value.combinationId === 'string') ||
    !isNonEmptyTrimmedString(value.exerciseNameSnapshot) ||
    !isNullableString(value.instruction)
  ) {
    return null
  }

  const configuration = parseExerciseConfiguration(value.configuration)

  if (configuration === null) {
    return null
  }

  return {
    id: value.id,
    type: 'exercise',
    combinationId: value.combinationId,
    exerciseNameSnapshot: value.exerciseNameSnapshot,
    instruction: value.instruction,
    configuration,
  }
}

function parseWorkoutBreak(value: unknown): WorkoutBreak | null {
  if (!isRecord(value) || value.type !== 'break') {
    return null
  }

  if (
    !isNonEmptyTrimmedString(value.id) ||
    !isPositiveSafeInteger(value.durationSeconds) ||
    !isNullableString(value.instruction)
  ) {
    return null
  }

  return {
    id: value.id,
    type: 'break',
    durationSeconds: value.durationSeconds,
    instruction: value.instruction,
  }
}

function parseWorkoutItem(value: unknown): WorkoutItem | null {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return null
  }

  if (value.type === 'exercise') {
    return parseWorkoutExercise(value)
  }

  if (value.type === 'break') {
    return parseWorkoutBreak(value)
  }

  return null
}

function parseWorkoutBlock(value: unknown): WorkoutBlock | null {
  if (!isRecord(value)) {
    return null
  }

  if (
    !isNonEmptyTrimmedString(value.id) ||
    typeof value.blockType !== 'string' ||
    !BLOCK_TYPES.has(value.blockType as WorkoutBlockType) ||
    !Array.isArray(value.items)
  ) {
    return null
  }

  const items: WorkoutItem[] = []

  for (const item of value.items) {
    const parsedItem = parseWorkoutItem(item)

    if (parsedItem === null) {
      return null
    }

    items.push(parsedItem)
  }

  return {
    id: value.id,
    blockType: value.blockType as WorkoutBlockType,
    items,
  }
}

function parseWorkoutPlanShape(value: unknown): WorkoutPlan | null {
  if (!isRecord(value)) {
    return null
  }

  if (
    !isNonEmptyTrimmedString(value.id) ||
    typeof value.disciplineKey !== 'string' ||
    !DISCIPLINE_KEYS.has(value.disciplineKey as DisciplineKey) ||
    !isNullableString(value.customName) ||
    !isNullableString(value.mainGoal) ||
    !isNonEmptyTrimmedString(value.nameSnapshot) ||
    !isValidStoredCreatedAt(value.createdAt) ||
    !Array.isArray(value.blocks)
  ) {
    return null
  }

  const blocks: WorkoutBlock[] = []

  for (const block of value.blocks) {
    const parsedBlock = parseWorkoutBlock(block)

    if (parsedBlock === null) {
      return null
    }

    blocks.push(parsedBlock)
  }

  return {
    id: value.id,
    disciplineKey: value.disciplineKey as DisciplineKey,
    customName: value.customName,
    mainGoal: value.mainGoal,
    nameSnapshot: value.nameSnapshot,
    createdAt: value.createdAt,
    blocks,
  }
}

function assertUniqueIdsWithinPlan(plan: WorkoutPlan): void {
  const blockIds = new Set<string>()
  const itemIds = new Set<string>()

  for (const block of plan.blocks) {
    if (blockIds.has(block.id)) {
      throw new WorkoutPlanStorageError(
        'invalid_data',
        'Workout plan storage contains duplicate block ids within a plan.',
      )
    }

    blockIds.add(block.id)

    for (const item of block.items) {
      if (itemIds.has(item.id)) {
        throw new WorkoutPlanStorageError(
          'invalid_data',
          'Workout plan storage contains duplicate item ids within a plan.',
        )
      }

      itemIds.add(item.id)
    }
  }
}

function toWorkoutPlanDraft(plan: WorkoutPlan): WorkoutPlanDraft {
  return {
    id: plan.id,
    disciplineKey: plan.disciplineKey,
    customName: plan.customName,
    mainGoal: plan.mainGoal,
    blocks: plan.blocks,
    createdAt: plan.createdAt,
  }
}

function assertPlanSemanticallyValid(plan: WorkoutPlan): void {
  const validation = validateWorkoutPlanDraft(toWorkoutPlanDraft(plan))

  if (!validation.isValid) {
    throw new WorkoutPlanStorageError(
      'invalid_data',
      'Workout plan storage contains a semantically invalid plan.',
    )
  }
}

export function parseStoredWorkoutPlan(value: unknown): WorkoutPlan {
  const plan = parseWorkoutPlanShape(value)

  if (plan === null) {
    throw new WorkoutPlanStorageError('invalid_data', 'Workout plan storage contains an invalid plan.')
  }

  assertUniqueIdsWithinPlan(plan)
  assertPlanSemanticallyValid(plan)

  return plan
}

export function createEmptyWorkoutPlanStorageEnvelope(): WorkoutPlanStorageEnvelopeV1 {
  return {
    schemaVersion: WORKOUT_PLAN_STORAGE_SCHEMA_VERSION,
    plans: [],
  }
}

function assertSchemaVersion(raw: Record<string, unknown>): void {
  if (!('schemaVersion' in raw)) {
    throw new WorkoutPlanStorageError(
      'invalid_data',
      'Workout plan storage envelope must include schemaVersion.',
    )
  }

  if (typeof raw.schemaVersion !== 'number' || !Number.isInteger(raw.schemaVersion)) {
    throw new WorkoutPlanStorageError(
      'invalid_data',
      'Workout plan storage envelope schemaVersion must be an integer.',
    )
  }

  if (raw.schemaVersion !== WORKOUT_PLAN_STORAGE_SCHEMA_VERSION) {
    throw new WorkoutPlanStorageError(
      'unsupported_schema_version',
      `Unsupported workout plan storage schema version: ${String(raw.schemaVersion)}.`,
    )
  }
}

export function parseWorkoutPlanStorageEnvelope(raw: unknown): WorkoutPlanStorageEnvelopeV1 {
  if (!isRecord(raw)) {
    throw new WorkoutPlanStorageError('invalid_data', 'Workout plan storage envelope must be an object.')
  }

  assertSchemaVersion(raw)

  if (!Array.isArray(raw.plans)) {
    throw new WorkoutPlanStorageError('invalid_data', 'Workout plan storage envelope plans must be an array.')
  }

  const plans: WorkoutPlan[] = []
  const planIds = new Set<string>()

  for (const plan of raw.plans) {
    const parsedPlan = parseStoredWorkoutPlan(plan)

    if (planIds.has(parsedPlan.id)) {
      throw new WorkoutPlanStorageError(
        'invalid_data',
        'Workout plan storage contains duplicate plan ids.',
      )
    }

    planIds.add(parsedPlan.id)
    plans.push(parsedPlan)
  }

  return {
    schemaVersion: WORKOUT_PLAN_STORAGE_SCHEMA_VERSION,
    plans,
  }
}

export function serializeWorkoutPlanStorageEnvelope(
  envelope: WorkoutPlanStorageEnvelopeV1,
): string {
  return JSON.stringify(envelope)
}

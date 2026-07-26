import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { WorkoutBlockType } from '@/domain/workout/workout.types'
import type {
  WorkoutSession,
  WorkoutSessionStepKind,
  WorkoutSessionStepOutcome,
  WorkoutSessionStepResult,
} from '@/domain/workout-session/workoutSession.types'

export const WORKOUT_SESSION_STORAGE_SCHEMA_VERSION = 1 as const

export interface WorkoutSessionStorageEnvelopeV1 {
  schemaVersion: typeof WORKOUT_SESSION_STORAGE_SCHEMA_VERSION
  sessions: WorkoutSession[]
}

export type WorkoutSessionStorageErrorCode =
  | 'read_failed'
  | 'write_failed'
  | 'invalid_json'
  | 'invalid_data'
  | 'unsupported_schema_version'

export class WorkoutSessionStorageError extends Error {
  readonly code: WorkoutSessionStorageErrorCode

  constructor(code: WorkoutSessionStorageErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined)
    this.name = 'WorkoutSessionStorageError'
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

const STEP_KINDS = new Set<WorkoutSessionStepKind>(['exercise', 'roundRest', 'break'])

const STEP_OUTCOMES = new Set<WorkoutSessionStepOutcome>(['completed', 'partial', 'skipped'])

const ENVELOPE_KEYS = ['schemaVersion', 'sessions'] as const

const SESSION_KEYS = [
  'id',
  'workoutPlanId',
  'workoutPlanNameSnapshot',
  'disciplineKey',
  'startedAt',
  'completedAt',
  'stepResults',
] as const

const STEP_RESULT_KEYS = [
  'playbackStepId',
  'workoutItemId',
  'blockId',
  'blockType',
  'kind',
  'nameSnapshot',
  'roundNumber',
  'roundCount',
  'plannedDurationSeconds',
  'performedDurationSeconds',
  'outcome',
] as const

const ISO_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
  const keys = Object.keys(value)

  if (keys.length !== expectedKeys.length) {
    return false
  }

  return expectedKeys.every((key) => keys.includes(key))
}

function assertExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
  message: string,
): void {
  if (!hasExactKeys(value, expectedKeys)) {
    throw new WorkoutSessionStorageError('invalid_data', message)
  }
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function getDaysInMonth(year: number, month: number): number {
  switch (month) {
    case 1:
    case 3:
    case 5:
    case 7:
    case 8:
    case 10:
    case 12:
      return 31
    case 4:
    case 6:
    case 9:
    case 11:
      return 30
    case 2:
      return isLeapYear(year) ? 29 : 28
    default:
      return 0
  }
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (year < 1 || year > 9999 || month < 1 || month > 12) {
    return false
  }

  const daysInMonth = getDaysInMonth(year, month)

  return day >= 1 && day <= daysInMonth
}

function isValidTimeOfDay(hour: number, minute: number, second: number): boolean {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59
}

function isValidTimezoneOffset(timezone: string): boolean {
  if (timezone === 'Z') {
    return true
  }

  const match = timezone.match(/^([+-])(\d{2}):(\d{2})$/)

  if (match === null) {
    return false
  }

  const offsetHours = Number(match[2])
  const offsetMinutes = Number(match[3])

  return offsetHours >= 0 && offsetHours <= 23 && offsetMinutes >= 0 && offsetMinutes <= 59
}

/**
 * Accepts RFC 3339 / ISO 8601 timestamps with Z or numeric offset.
 * Fractional seconds: 1–3 digits. Calendar components are validated explicitly.
 */
function isValidIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value !== value.trim()) {
    return false
  }

  const match = ISO_TIMESTAMP_PATTERN.exec(value)

  if (match === null) {
    return false
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const timezone = match[8]

  if (
    !isValidCalendarDate(year, month, day) ||
    !isValidTimeOfDay(hour, minute, second) ||
    !isValidTimezoneOffset(timezone)
  ) {
    return false
  }

  const timestamp = Date.parse(value)

  return Number.isFinite(timestamp)
}

function isNonEmptyTrimmedString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isNullablePositiveSafeInteger(value: unknown): value is number | null {
  return value === null || isPositiveSafeInteger(value)
}

function assertOutcomeMatchesDurations(
  outcome: WorkoutSessionStepOutcome,
  plannedDurationSeconds: number,
  performedDurationSeconds: number,
): void {
  if (outcome === 'completed' && performedDurationSeconds !== plannedDurationSeconds) {
    throw new WorkoutSessionStorageError(
      'invalid_data',
      'Completed step result requires performedDurationSeconds to equal plannedDurationSeconds.',
    )
  }

  if (outcome === 'skipped' && performedDurationSeconds !== 0) {
    throw new WorkoutSessionStorageError(
      'invalid_data',
      'Skipped step result requires performedDurationSeconds to equal 0.',
    )
  }

  if (
    outcome === 'partial' &&
    (performedDurationSeconds <= 0 || performedDurationSeconds >= plannedDurationSeconds)
  ) {
    throw new WorkoutSessionStorageError(
      'invalid_data',
      'Partial step result requires performedDurationSeconds between 0 and plannedDurationSeconds.',
    )
  }
}

function assertRoundDataForKind(
  kind: WorkoutSessionStepKind,
  roundNumber: number | null,
  roundCount: number | null,
): void {
  if (kind === 'exercise') {
    if (roundNumber === null && roundCount === null) {
      return
    }

    if (!isPositiveSafeInteger(roundNumber) || !isPositiveSafeInteger(roundCount)) {
      throw new WorkoutSessionStorageError(
        'invalid_data',
        'Round-based exercise step result requires positive roundNumber and roundCount.',
      )
    }

    if (roundNumber > roundCount) {
      throw new WorkoutSessionStorageError(
        'invalid_data',
        'Round-based exercise step result requires roundNumber <= roundCount.',
      )
    }

    return
  }

  if (roundNumber !== null || roundCount !== null) {
    throw new WorkoutSessionStorageError(
      'invalid_data',
      'Round rest and break step results require roundNumber and roundCount to be null.',
    )
  }
}

function parseWorkoutSessionStepResult(value: unknown): WorkoutSessionStepResult {
  if (!isRecord(value)) {
    throw new WorkoutSessionStorageError('invalid_data', 'Workout session step result must be an object.')
  }

  assertExactKeys(
    value,
    STEP_RESULT_KEYS,
    'Workout session step result contains unexpected or missing fields.',
  )

  if (
    !isNonEmptyTrimmedString(value.playbackStepId) ||
    !isNonEmptyTrimmedString(value.workoutItemId) ||
    !isNonEmptyTrimmedString(value.blockId) ||
    typeof value.blockType !== 'string' ||
    !BLOCK_TYPES.has(value.blockType as WorkoutBlockType) ||
    typeof value.kind !== 'string' ||
    !STEP_KINDS.has(value.kind as WorkoutSessionStepKind) ||
    !isNonEmptyTrimmedString(value.nameSnapshot) ||
    !isNullablePositiveSafeInteger(value.roundNumber) ||
    !isNullablePositiveSafeInteger(value.roundCount) ||
    !isPositiveSafeInteger(value.plannedDurationSeconds) ||
    !isNonNegativeSafeInteger(value.performedDurationSeconds) ||
    typeof value.outcome !== 'string' ||
    !STEP_OUTCOMES.has(value.outcome as WorkoutSessionStepOutcome)
  ) {
    throw new WorkoutSessionStorageError('invalid_data', 'Workout session step result has invalid fields.')
  }

  const kind = value.kind as WorkoutSessionStepKind
  const outcome = value.outcome as WorkoutSessionStepOutcome
  const plannedDurationSeconds = value.plannedDurationSeconds
  const performedDurationSeconds = value.performedDurationSeconds
  const roundNumber = value.roundNumber as number | null
  const roundCount = value.roundCount as number | null

  if (performedDurationSeconds > plannedDurationSeconds) {
    throw new WorkoutSessionStorageError(
      'invalid_data',
      'Workout session step result performedDurationSeconds cannot exceed plannedDurationSeconds.',
    )
  }

  assertOutcomeMatchesDurations(outcome, plannedDurationSeconds, performedDurationSeconds)
  assertRoundDataForKind(kind, roundNumber, roundCount)

  return {
    playbackStepId: value.playbackStepId,
    workoutItemId: value.workoutItemId,
    blockId: value.blockId,
    blockType: value.blockType as WorkoutBlockType,
    kind,
    nameSnapshot: value.nameSnapshot,
    roundNumber,
    roundCount,
    plannedDurationSeconds,
    performedDurationSeconds,
    outcome,
  }
}

function assertUniquePlaybackStepIds(stepResults: readonly WorkoutSessionStepResult[]): void {
  const playbackStepIds = new Set<string>()

  for (const step of stepResults) {
    if (playbackStepIds.has(step.playbackStepId)) {
      throw new WorkoutSessionStorageError(
        'invalid_data',
        'Workout session contains duplicate playbackStepId values.',
      )
    }

    playbackStepIds.add(step.playbackStepId)
  }
}

function assertSessionTimestamps(startedAt: string, completedAt: string): void {
  const startedTimestamp = Date.parse(startedAt)
  const completedTimestamp = Date.parse(completedAt)

  if (completedTimestamp < startedTimestamp) {
    throw new WorkoutSessionStorageError(
      'invalid_data',
      'Workout session completedAt cannot be earlier than startedAt.',
    )
  }
}

function parseWorkoutSessionShape(value: unknown): WorkoutSession {
  if (!isRecord(value)) {
    throw new WorkoutSessionStorageError('invalid_data', 'Workout session must be an object.')
  }

  assertExactKeys(value, SESSION_KEYS, 'Workout session contains unexpected or missing fields.')

  if (
    !isNonEmptyTrimmedString(value.id) ||
    !isNonEmptyTrimmedString(value.workoutPlanId) ||
    !isNonEmptyTrimmedString(value.workoutPlanNameSnapshot) ||
    typeof value.disciplineKey !== 'string' ||
    !DISCIPLINE_KEYS.has(value.disciplineKey as DisciplineKey) ||
    !isValidIsoTimestamp(value.startedAt) ||
    !isValidIsoTimestamp(value.completedAt) ||
    !Array.isArray(value.stepResults)
  ) {
    throw new WorkoutSessionStorageError('invalid_data', 'Workout session has invalid fields.')
  }

  const stepResults: WorkoutSessionStepResult[] = []

  for (const step of value.stepResults) {
    stepResults.push(parseWorkoutSessionStepResult(step))
  }

  assertUniquePlaybackStepIds(stepResults)

  const startedAt = value.startedAt
  const completedAt = value.completedAt
  assertSessionTimestamps(startedAt, completedAt)

  return {
    id: value.id,
    workoutPlanId: value.workoutPlanId,
    workoutPlanNameSnapshot: value.workoutPlanNameSnapshot,
    disciplineKey: value.disciplineKey as DisciplineKey,
    startedAt,
    completedAt,
    stepResults,
  }
}

export function parseStoredWorkoutSession(value: unknown): WorkoutSession {
  return parseWorkoutSessionShape(value)
}

export function createEmptyWorkoutSessionStorageEnvelope(): WorkoutSessionStorageEnvelopeV1 {
  return {
    schemaVersion: WORKOUT_SESSION_STORAGE_SCHEMA_VERSION,
    sessions: [],
  }
}

function assertSchemaVersion(raw: Record<string, unknown>): void {
  if (!('schemaVersion' in raw)) {
    throw new WorkoutSessionStorageError(
      'invalid_data',
      'Workout session storage envelope must include schemaVersion.',
    )
  }

  if (typeof raw.schemaVersion !== 'number' || !Number.isInteger(raw.schemaVersion)) {
    throw new WorkoutSessionStorageError(
      'invalid_data',
      'Workout session storage envelope schemaVersion must be an integer.',
    )
  }

  if (raw.schemaVersion !== WORKOUT_SESSION_STORAGE_SCHEMA_VERSION) {
    throw new WorkoutSessionStorageError(
      'unsupported_schema_version',
      `Unsupported workout session storage schema version: ${String(raw.schemaVersion)}.`,
    )
  }
}

export function parseWorkoutSessionStorageEnvelope(raw: unknown): WorkoutSessionStorageEnvelopeV1 {
  if (!isRecord(raw)) {
    throw new WorkoutSessionStorageError('invalid_data', 'Workout session storage envelope must be an object.')
  }

  assertSchemaVersion(raw)

  assertExactKeys(
    raw,
    ENVELOPE_KEYS,
    'Workout session storage envelope contains unexpected or missing fields.',
  )

  if (!Array.isArray(raw.sessions)) {
    throw new WorkoutSessionStorageError('invalid_data', 'Workout session storage envelope sessions must be an array.')
  }

  const sessions: WorkoutSession[] = []
  const sessionIds = new Set<string>()

  for (const session of raw.sessions) {
    const parsedSession = parseWorkoutSessionShape(session)

    if (sessionIds.has(parsedSession.id)) {
      throw new WorkoutSessionStorageError(
        'invalid_data',
        'Workout session storage contains duplicate session ids.',
      )
    }

    sessionIds.add(parsedSession.id)
    sessions.push(parsedSession)
  }

  return {
    schemaVersion: WORKOUT_SESSION_STORAGE_SCHEMA_VERSION,
    sessions,
  }
}

export function serializeWorkoutSessionStorageEnvelope(envelope: WorkoutSessionStorageEnvelopeV1): string {
  return JSON.stringify(envelope)
}

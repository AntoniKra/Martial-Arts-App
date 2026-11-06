import { afterEach, describe, expect, it, vi } from 'vitest'

import { LocalStorageWorkoutSessionRepository, DEFAULT_WORKOUT_SESSION_STORAGE_KEY } from '@/infrastructure/storage/localStorageWorkoutSessionRepository'
import { parseStoredWorkoutSession, parseWorkoutSessionStorageEnvelope, WorkoutSessionStorageError } from '@/infrastructure/storage/workoutSessionStorageSchema'
import { createMemoryStorage } from '@/test/memoryStorage'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'

const originalDateTimeFormat = Intl.DateTimeFormat
function deviceTimezone(timeZone: string) {
  vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (locales, options) {
    return new originalDateTimeFormat(locales, { ...options, timeZone: options?.timeZone ?? timeZone })
  })
}

function legacySession(version: 1 | 2) {
  const { id, workoutPlanId, workoutPlanNameSnapshot, disciplineKey } = workoutSession()
  return {
    id, workoutPlanId, workoutPlanNameSnapshot, disciplineKey,
    startedAt: '2026-11-03T00:30:00Z', completedAt: '2026-11-03T02:30:00Z',
    stepResults: [
      sessionStep({ blockType: 'warmup', workoutItemId: 'warmup' }),
      sessionStep({ playbackStepId: 'sparring-1', blockType: 'sparring', roundNumber: 1, roundCount: 2 }),
      sessionStep({ playbackStepId: 'rest', kind: 'roundRest', blockType: 'sparring', plannedDurationSeconds: 30, performedDurationSeconds: 30 }),
      sessionStep({ playbackStepId: 'sparring-2', blockType: 'sparring', roundNumber: 2, roundCount: 2, outcome: 'partial', performedDurationSeconds: 10 }),
    ],
    ...(version === 2 ? { note: '  Legacy note  ' } : {}),
  }
}

afterEach(() => vi.restoreAllMocks())

describe('workout session schema v3', () => {
  it.each([1, 2] as const)('migrates v%s on read and persists the timezone exactly once', async (version) => {
    deviceTimezone('America/Los_Angeles')
    const storage = createMemoryStorage()
    const legacy = legacySession(version)
    storage.setItem(DEFAULT_WORKOUT_SESSION_STORAGE_KEY, JSON.stringify({ schemaVersion: version, sessions: [legacy] }))
    const repository = new LocalStorageWorkoutSessionRepository(storage)
    const [session] = await repository.list()
    expect(session).toMatchObject({
      source: 'plan', status: 'partial', durationSeconds: 160, workSeconds: 120, sparringSeconds: 60,
      completion: { completedExercises: 1, plannedExercises: 2 },
      workoutDate: '2026-11-02', timezone: 'America/Los_Angeles', category: 'sparring',
      note: version === 1 ? null : 'Legacy note',
    })
    expect(session.stepResults).toEqual(legacy.stepResults)
    const migratedRaw = storage.getItem(DEFAULT_WORKOUT_SESSION_STORAGE_KEY)
    expect(JSON.parse(migratedRaw ?? '')).toEqual({ schemaVersion: 3, sessions: [session] })
    vi.restoreAllMocks()
    deviceTimezone('Asia/Tokyo')
    expect(await repository.getById(session.id)).toEqual(session)
    expect(storage.getItem(DEFAULT_WORKOUT_SESSION_STORAGE_KEY)).toBe(migratedRaw)
  })

  it.each([1, 2] as const)('preserves a zero-work legacy v%s entry rather than deleting history', (version) => {
    const legacy = legacySession(version)
    legacy.stepResults = [sessionStep({ outcome: 'skipped', performedDurationSeconds: 0 })]
    expect(parseWorkoutSessionStorageEnvelope({ schemaVersion: version, sessions: [legacy] }).sessions)
      .toMatchObject([{ source: 'plan', status: 'partial', workSeconds: 0, durationSeconds: 0 }])
  })

  it('saves repeated completed work and fractional duration without changing the snapshot', async () => {
    const storage = createMemoryStorage()
    const repository = new LocalStorageWorkoutSessionRepository(storage)
    const session = workoutSession({ stepResults: [sessionStep()], durationSeconds: 120.5, workSeconds: 120 })
    await repository.save(session)
    expect(JSON.parse(storage.getItem(DEFAULT_WORKOUT_SESSION_STORAGE_KEY) ?? '')).toEqual({ schemaVersion: 3, sessions: [session] })
    expect(await repository.getById(session.id)).toEqual(session)
    await repository.updateNote(session.id, ' Note ')
    expect(await repository.getById(session.id)).toEqual({ ...session, note: 'Note' })
  })

  it('accepts a legacy partial step in v3 without adding its elapsed seconds to work', () => {
    const stepResults = [sessionStep({ outcome: 'partial', performedDurationSeconds: 30, blockType: 'sparring' })]
    const session = workoutSession({ stepResults })
    expect(parseStoredWorkoutSession(session)).toMatchObject({
      stepResults, durationSeconds: 30, workSeconds: 0, sparringSeconds: 0,
    })
    expect(() => parseStoredWorkoutSession({ ...session, workSeconds: 30, sparringSeconds: 30 }))
      .toThrow(WorkoutSessionStorageError)
  })

  it('supports not-applicable completion and unknown work for a future manual entry', () => {
    expect(parseStoredWorkoutSession(workoutSession({
      source: 'manual', completion: null, workSeconds: null, sparringSeconds: null, durationSeconds: 60,
    }))).toMatchObject({ source: 'manual', completion: null, workSeconds: null, sparringSeconds: null })
  })

  it.each([
    { source: 'unknown' }, { status: 'abandoned' }, { category: 'warmup' },
    { durationSeconds: -1 }, { durationSeconds: Infinity }, { workSeconds: NaN },
    { durationSeconds: 0, workSeconds: 0 },
    { durationSeconds: 120, workSeconds: 60.5 },
    { sparringSeconds: 1 },
    { workSeconds: 61 }, { sparringSeconds: 61 },
    { completion: null }, { workSeconds: null }, { sparringSeconds: null },
    { completion: { completedExercises: 2, plannedExercises: 1 } },
    { completion: { completedExercises: 0, plannedExercises: 1 } },
    { completion: { completedExercises: 0.5, plannedExercises: 1 } },
    { completion: { completedExercises: 1, plannedExercises: 1, extra: true } },
    { workoutDate: '2026-02-30' }, { workoutDate: '2026-11-03' },
    { timezone: 'Unknown/Timezone' }, { timezone: '+01:00' },
    { unexpected: true },
  ])('rejects invalid v3 fields: %j', (fields) => {
    expect(() => parseStoredWorkoutSession({ ...workoutSession({ stepResults: [sessionStep()] }), ...fields }))
      .toThrow(WorkoutSessionStorageError)
  })

  it('rejects a completed status when an exercise was skipped', () => {
    expect(() => parseStoredWorkoutSession(workoutSession({
      stepResults: [sessionStep({ outcome: 'skipped', performedDurationSeconds: 0 })], status: 'completed',
    }))).toThrow(WorkoutSessionStorageError)
  })

  it('does not overwrite unreadable or unsupported data during migration', async () => {
    const storage = createMemoryStorage()
    const repository = new LocalStorageWorkoutSessionRepository(storage)
    const raw = JSON.stringify({ schemaVersion: 4, sessions: [] })
    storage.setItem(DEFAULT_WORKOUT_SESSION_STORAGE_KEY, raw)
    await expect(repository.list()).rejects.toMatchObject({ code: 'unsupported_schema_version' })
    expect(storage.getItem(DEFAULT_WORKOUT_SESSION_STORAGE_KEY)).toBe(raw)
  })

  it.each([1, 2] as const)('returns migrated v%s data after a failed write and retries on subsequent reads', async (version) => {
    deviceTimezone('Europe/Warsaw')
    const storage = createMemoryStorage()
    const raw = JSON.stringify({ schemaVersion: version, sessions: [legacySession(version)] })
    storage.setItem(DEFAULT_WORKOUT_SESSION_STORAGE_KEY, raw)
    const originalSetItem = storage.setItem
    const write = vi.spyOn(storage, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded') })
    const repository = new LocalStorageWorkoutSessionRepository(storage)
    const [session] = await repository.list()
    expect(session).toMatchObject({ source: 'plan', durationSeconds: 160, workSeconds: 120, sparringSeconds: 60 })
    expect(storage.getItem(DEFAULT_WORKOUT_SESSION_STORAGE_KEY)).toBe(raw)
    expect(await repository.getById(session.id)).toEqual(session)
    expect(write).toHaveBeenCalledTimes(2)
    expect(storage.getItem(DEFAULT_WORKOUT_SESSION_STORAGE_KEY)).toBe(raw)

    write.mockImplementation(originalSetItem)
    expect(await repository.list()).toEqual([session])
    expect(write).toHaveBeenCalledTimes(3)
    expect(JSON.parse(storage.getItem(DEFAULT_WORKOUT_SESSION_STORAGE_KEY) ?? 'null'))
      .toEqual({ schemaVersion: 3, sessions: [session] })
    expect(await repository.getById(session.id)).toEqual(session)
    expect(write).toHaveBeenCalledTimes(3)
  })
})

import type { WorkoutSessionRepository } from '@/application/workout-session/workoutSessionRepository'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import {
  createEmptyWorkoutSessionStorageEnvelope,
  normalizeWorkoutSessionNote,
  parseStoredWorkoutSession,
  parseWorkoutSessionStorageEnvelope,
  serializeWorkoutSessionStorageEnvelope,
  WorkoutSessionStorageError,
  WORKOUT_SESSION_STORAGE_SCHEMA_VERSION,
  type WorkoutSessionStorageEnvelopeRead,
  type WorkoutSessionStorageEnvelopeV2,
} from '@/infrastructure/storage/workoutSessionStorageSchema'

export const DEFAULT_WORKOUT_SESSION_STORAGE_KEY = 'combat-training.workout-sessions'

function cloneWorkoutSession(session: WorkoutSession): WorkoutSession {
  return structuredClone(session)
}

function cloneWorkoutSessionForWrite(session: WorkoutSession): WorkoutSession {
  try {
    return cloneWorkoutSession(session)
  } catch (error) {
    throw new WorkoutSessionStorageError('write_failed', 'Failed to clone workout session.', {
      cause: error,
    })
  }
}

function sortSessionsByCompletedAtDescending(sessions: WorkoutSession[]): WorkoutSession[] {
  return [...sessions].sort((left, right) => right.completedAt.localeCompare(left.completedAt))
}

export class LocalStorageWorkoutSessionRepository implements WorkoutSessionRepository {
  private readonly storage: Storage
  private readonly storageKey: string

  constructor(storage: Storage, storageKey: string = DEFAULT_WORKOUT_SESSION_STORAGE_KEY) {
    this.storage = storage
    this.storageKey = storageKey
  }

  async save(session: WorkoutSession): Promise<void> {
    const validatedSession = parseStoredWorkoutSession(session)
    const envelope = this.readEnvelope()
    const sessions = envelope.sessions.map(cloneWorkoutSessionForWrite)
    const existingIndex = sessions.findIndex((candidate) => candidate.id === validatedSession.id)
    const sessionCopy = cloneWorkoutSessionForWrite(validatedSession)

    if (existingIndex === -1) {
      sessions.push(sessionCopy)
    } else {
      sessions[existingIndex] = sessionCopy
    }

    this.writeEnvelope({
      schemaVersion: WORKOUT_SESSION_STORAGE_SCHEMA_VERSION,
      sessions,
    })
  }

  async list(): Promise<WorkoutSession[]> {
    const envelope = this.readEnvelope()
    return sortSessionsByCompletedAtDescending(envelope.sessions.map(cloneWorkoutSession))
  }

  async getById(id: string): Promise<WorkoutSession | null> {
    const envelope = this.readEnvelope()
    const session = envelope.sessions.find((candidate) => candidate.id === id)

    return session ? cloneWorkoutSession(session) : null
  }

  async updateNote(id: string, note: string | null): Promise<boolean> {
    const normalizedNote = normalizeWorkoutSessionNote(note)
    const envelope = this.readEnvelope()
    const sessions = envelope.sessions.map(cloneWorkoutSessionForWrite)
    const existingIndex = sessions.findIndex((candidate) => candidate.id === id)

    if (existingIndex === -1) {
      return false
    }

    sessions[existingIndex] = {
      ...sessions[existingIndex],
      note: normalizedNote,
    }

    this.writeEnvelope({
      schemaVersion: WORKOUT_SESSION_STORAGE_SCHEMA_VERSION,
      sessions,
    })

    return true
  }

  async delete(id: string): Promise<boolean> {
    const envelope = this.readEnvelope()
    const existingIndex = envelope.sessions.findIndex((candidate) => candidate.id === id)

    if (existingIndex === -1) {
      return false
    }

    const sessions = envelope.sessions
      .filter((candidate) => candidate.id !== id)
      .map(cloneWorkoutSessionForWrite)

    this.writeEnvelope({
      schemaVersion: WORKOUT_SESSION_STORAGE_SCHEMA_VERSION,
      sessions,
    })

    return true
  }

  private readEnvelope(): WorkoutSessionStorageEnvelopeRead {
    let rawValue: string | null

    try {
      rawValue = this.storage.getItem(this.storageKey)
    } catch (error) {
      throw new WorkoutSessionStorageError('read_failed', 'Failed to read workout sessions from storage.', {
        cause: error,
      })
    }

    if (rawValue === null) {
      return createEmptyWorkoutSessionStorageEnvelope()
    }

    let parsed: unknown

    try {
      parsed = JSON.parse(rawValue)
    } catch (error) {
      throw new WorkoutSessionStorageError('invalid_json', 'Workout session storage contains invalid JSON.', {
        cause: error,
      })
    }

    try {
      return parseWorkoutSessionStorageEnvelope(parsed)
    } catch (error) {
      if (error instanceof WorkoutSessionStorageError) {
        throw error
      }

      throw new WorkoutSessionStorageError('invalid_data', 'Workout session storage contains invalid data.', {
        cause: error,
      })
    }
  }

  private writeEnvelope(envelope: WorkoutSessionStorageEnvelopeV2): void {
    let serialized: string

    try {
      serialized = serializeWorkoutSessionStorageEnvelope(envelope)
    } catch (error) {
      throw new WorkoutSessionStorageError('write_failed', 'Failed to serialize workout session storage.', {
        cause: error,
      })
    }

    try {
      this.storage.setItem(this.storageKey, serialized)
    } catch (error) {
      throw new WorkoutSessionStorageError('write_failed', 'Failed to write workout sessions to storage.', {
        cause: error,
      })
    }
  }
}

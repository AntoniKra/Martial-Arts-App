import type { WorkoutPlanRepository } from '@/application/workout/workoutPlanRepository'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import {
  createEmptyWorkoutPlanStorageEnvelope,
  parseStoredWorkoutPlan,
  parseWorkoutPlanStorageEnvelope,
  serializeWorkoutPlanStorageEnvelope,
  WorkoutPlanStorageError,
  type WorkoutPlanStorageEnvelopeV1,
} from '@/infrastructure/storage/workoutPlanStorageSchema'

export const DEFAULT_WORKOUT_PLAN_STORAGE_KEY = 'combat-training.workout-plans'

function cloneWorkoutPlan(plan: WorkoutPlan): WorkoutPlan {
  return structuredClone(plan)
}

function cloneWorkoutPlanForWrite(plan: WorkoutPlan): WorkoutPlan {
  try {
    return cloneWorkoutPlan(plan)
  } catch (error) {
    throw new WorkoutPlanStorageError('write_failed', 'Failed to clone workout plan.', {
      cause: error,
    })
  }
}

export class LocalStorageWorkoutPlanRepository implements WorkoutPlanRepository {
  private readonly storage: Storage
  private readonly storageKey: string

  constructor(storage: Storage, storageKey: string = DEFAULT_WORKOUT_PLAN_STORAGE_KEY) {
    this.storage = storage
    this.storageKey = storageKey
  }

  async save(plan: WorkoutPlan): Promise<void> {
    const validatedPlan = parseStoredWorkoutPlan(plan)
    const envelope = this.readEnvelope()
    const plans = envelope.plans.map(cloneWorkoutPlanForWrite)
    const existingIndex = plans.findIndex((candidate) => candidate.id === validatedPlan.id)
    const planCopy = cloneWorkoutPlanForWrite(validatedPlan)

    if (existingIndex === -1) {
      plans.push(planCopy)
    } else {
      plans[existingIndex] = planCopy
    }

    this.writeEnvelope({
      schemaVersion: 1,
      plans,
    })
  }

  async list(): Promise<WorkoutPlan[]> {
    const envelope = this.readEnvelope()
    return envelope.plans.map(cloneWorkoutPlan)
  }

  async getById(id: string): Promise<WorkoutPlan | null> {
    const envelope = this.readEnvelope()
    const plan = envelope.plans.find((candidate) => candidate.id === id)

    return plan ? cloneWorkoutPlan(plan) : null
  }

  private readEnvelope(): WorkoutPlanStorageEnvelopeV1 {
    let rawValue: string | null

    try {
      rawValue = this.storage.getItem(this.storageKey)
    } catch (error) {
      throw new WorkoutPlanStorageError('read_failed', 'Failed to read workout plans from storage.', {
        cause: error,
      })
    }

    if (rawValue === null) {
      return createEmptyWorkoutPlanStorageEnvelope()
    }

    let parsed: unknown

    try {
      parsed = JSON.parse(rawValue)
    } catch (error) {
      throw new WorkoutPlanStorageError('invalid_json', 'Workout plan storage contains invalid JSON.', {
        cause: error,
      })
    }

    try {
      return parseWorkoutPlanStorageEnvelope(parsed)
    } catch (error) {
      if (error instanceof WorkoutPlanStorageError) {
        throw error
      }

      throw new WorkoutPlanStorageError('invalid_data', 'Workout plan storage contains invalid data.', {
        cause: error,
      })
    }
  }

  private writeEnvelope(envelope: WorkoutPlanStorageEnvelopeV1): void {
    let serialized: string

    try {
      serialized = serializeWorkoutPlanStorageEnvelope(envelope)
    } catch (error) {
      throw new WorkoutPlanStorageError('write_failed', 'Failed to serialize workout plan storage.', {
        cause: error,
      })
    }

    try {
      this.storage.setItem(this.storageKey, serialized)
    } catch (error) {
      throw new WorkoutPlanStorageError('write_failed', 'Failed to write workout plans to storage.', {
        cause: error,
      })
    }
  }
}

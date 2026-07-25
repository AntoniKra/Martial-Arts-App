import type {
  WorkoutBlock,
  WorkoutBlockType,
  WorkoutBreak,
  WorkoutExercise,
} from '@/domain/workout/workout.types'
import type { ExerciseConfiguration } from '@/domain/workout/workout.types'

export function createWorkoutBlock(blockType: WorkoutBlockType): WorkoutBlock {
  return {
    id: crypto.randomUUID(),
    blockType,
    items: [],
  }
}

export function createWorkoutBreak(
  durationSeconds = 60,
  instruction: string | null = null,
): WorkoutBreak {
  return {
    id: crypto.randomUUID(),
    type: 'break',
    durationSeconds,
    instruction,
  }
}

export function createWorkoutExercise(
  combinationId: string | null,
  exerciseNameSnapshot: string,
  instruction: string | null,
  configuration: ExerciseConfiguration,
): WorkoutExercise {
  return {
    id: crypto.randomUUID(),
    type: 'exercise',
    combinationId,
    exerciseNameSnapshot,
    instruction,
    configuration,
  }
}

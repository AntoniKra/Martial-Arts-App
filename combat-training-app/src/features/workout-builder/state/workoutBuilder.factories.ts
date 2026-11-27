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
    ...(blockType === 'sparring' ? { blockType, sparringIntensity: null } : { blockType }),
    items: [],
  }
}

export const DEFAULT_BREAK_DURATION_SECONDS = 60

export function createWorkoutBreak(
  durationSeconds = DEFAULT_BREAK_DURATION_SECONDS,
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
    focusSkillId: null,
    exerciseNameSnapshot,
    instruction,
    configuration,
  }
}

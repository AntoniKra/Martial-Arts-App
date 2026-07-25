import type { WorkoutBlock, WorkoutBlockType, WorkoutBreak } from '@/domain/workout/workout.types'

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

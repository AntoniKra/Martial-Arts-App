import { resolveWorkoutPlanDisplayName } from '@/domain/workout/workoutPlanDisplayName'
import type {
  ExerciseConfiguration,
  WorkoutBlock,
  WorkoutExercise,
  WorkoutItem,
} from '@/domain/workout/workout.types'
import { DEFAULT_ROUND_EXERCISE_CONFIGURATION } from '@/features/workout-builder/state/workoutBuilder.types'
import type { WorkoutBuilderState } from '@/features/workout-builder/state/workoutBuilder.types'

export function selectDisplayPlanName(state: WorkoutBuilderState): string {
  return resolveWorkoutPlanDisplayName(state.draft)
}

export function selectCanEditDiscipline(state: WorkoutBuilderState): boolean {
  return !state.disciplineLocked
}

export function canMoveBlockUp(blocks: readonly WorkoutBlock[], blockId: string): boolean {
  const blockIndex = blocks.findIndex((block) => block.id === blockId)
  return blockIndex > 0
}

export function canMoveBlockDown(blocks: readonly WorkoutBlock[], blockId: string): boolean {
  const blockIndex = blocks.findIndex((block) => block.id === blockId)
  return blockIndex >= 0 && blockIndex < blocks.length - 1
}

export function canMoveItemUp(items: readonly WorkoutItem[], itemId: string): boolean {
  const itemIndex = items.findIndex((item) => item.id === itemId)
  return itemIndex > 0
}

export function canMoveItemDown(items: readonly WorkoutItem[], itemId: string): boolean {
  const itemIndex = items.findIndex((item) => item.id === itemId)
  return itemIndex >= 0 && itemIndex < items.length - 1
}

export function selectBlockById(
  blocks: readonly WorkoutBlock[],
  blockId: string,
): WorkoutBlock | null {
  return blocks.find((block) => block.id === blockId) ?? null
}

export function selectExerciseById(
  block: WorkoutBlock,
  exerciseId: string,
): WorkoutExercise | null {
  const item = block.items.find((candidate) => candidate.id === exerciseId)

  if (!item || item.type !== 'exercise') {
    return null
  }

  return item
}

export function selectInheritedExerciseConfiguration(block: WorkoutBlock): ExerciseConfiguration {
  for (let index = block.items.length - 1; index >= 0; index -= 1) {
    const item = block.items[index]

    if (item.type === 'exercise') {
      if (item.configuration.mode === 'rounds') {
        return {
          mode: 'rounds',
          roundCount: item.configuration.roundCount,
          roundDurationSeconds: item.configuration.roundDurationSeconds,
          restBetweenRoundsSeconds: item.configuration.restBetweenRoundsSeconds,
        }
      }

      return {
        mode: 'continuous',
        durationSeconds: item.configuration.durationSeconds,
      }
    }
  }

  return { ...DEFAULT_ROUND_EXERCISE_CONFIGURATION }
}

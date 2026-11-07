import { resolveWorkoutPlanDisplayName } from '@/domain/workout/workoutPlanDisplayName'
import type {
  RoundExerciseConfiguration,
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

function defaultRoundConfiguration(): RoundExerciseConfiguration {
  return {
    mode: 'rounds',
    roundCount: DEFAULT_ROUND_EXERCISE_CONFIGURATION.roundCount,
    roundDurationSeconds: DEFAULT_ROUND_EXERCISE_CONFIGURATION.roundDurationSeconds,
    restBetweenRoundsSeconds: DEFAULT_ROUND_EXERCISE_CONFIGURATION.restBetweenRoundsSeconds,
  }
}

/** Round settings for a new exercise appended at the end of `blockId`. */
export function selectStartingRoundConfiguration(
  blocks: readonly WorkoutBlock[],
  blockId: string,
): RoundExerciseConfiguration {
  const blockIndex = blocks.findIndex((block) => block.id === blockId)

  if (blockIndex === -1) {
    return defaultRoundConfiguration()
  }

  for (let currentBlockIndex = blockIndex; currentBlockIndex >= 0; currentBlockIndex -= 1) {
    const items = blocks[currentBlockIndex].items

    for (let itemIndex = items.length - 1; itemIndex >= 0; itemIndex -= 1) {
      const item = items[itemIndex]

      if (item.type === 'exercise' && item.configuration.mode === 'rounds') {
        return {
          mode: 'rounds',
          roundCount: item.configuration.roundCount,
          roundDurationSeconds: item.configuration.roundDurationSeconds,
          restBetweenRoundsSeconds: item.configuration.restBetweenRoundsSeconds,
        }
      }
    }
  }

  return defaultRoundConfiguration()
}

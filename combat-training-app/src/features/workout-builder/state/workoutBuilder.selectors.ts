import { resolveWorkoutPlanDisplayName } from '@/domain/workout/workoutPlanDisplayName'
import type {
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

const DEFAULT_CONTINUOUS_DURATION_SECONDS = 300

export interface StartingExerciseConfiguration {
  mode: 'rounds' | 'continuous'
  roundCount: number
  roundDurationSeconds: number
  restBetweenRoundsSeconds: number
  continuousDurationSeconds: number
}

function defaultStartingExerciseConfiguration(): StartingExerciseConfiguration {
  return {
    mode: 'rounds',
    roundCount: DEFAULT_ROUND_EXERCISE_CONFIGURATION.roundCount,
    roundDurationSeconds: DEFAULT_ROUND_EXERCISE_CONFIGURATION.roundDurationSeconds,
    restBetweenRoundsSeconds: DEFAULT_ROUND_EXERCISE_CONFIGURATION.restBetweenRoundsSeconds,
    continuousDurationSeconds: DEFAULT_CONTINUOUS_DURATION_SECONDS,
  }
}

function lastExerciseInBlock(block: WorkoutBlock): WorkoutExercise | null {
  for (let index = block.items.length - 1; index >= 0; index -= 1) {
    const item = block.items[index]

    if (item.type === 'exercise') {
      return item
    }
  }

  return null
}

function lastRoundsSettings(
  blocks: readonly WorkoutBlock[],
  blockIndex: number,
): Pick<StartingExerciseConfiguration, 'roundCount' | 'roundDurationSeconds' | 'restBetweenRoundsSeconds'> {
  for (let currentBlockIndex = blockIndex; currentBlockIndex >= 0; currentBlockIndex -= 1) {
    const items = blocks[currentBlockIndex].items

    for (let itemIndex = items.length - 1; itemIndex >= 0; itemIndex -= 1) {
      const item = items[itemIndex]

      if (item.type === 'exercise' && item.configuration.mode === 'rounds') {
        return {
          roundCount: item.configuration.roundCount,
          roundDurationSeconds: item.configuration.roundDurationSeconds,
          restBetweenRoundsSeconds: item.configuration.restBetweenRoundsSeconds,
        }
      }
    }
  }

  return {
    roundCount: DEFAULT_ROUND_EXERCISE_CONFIGURATION.roundCount,
    roundDurationSeconds: DEFAULT_ROUND_EXERCISE_CONFIGURATION.roundDurationSeconds,
    restBetweenRoundsSeconds: DEFAULT_ROUND_EXERCISE_CONFIGURATION.restBetweenRoundsSeconds,
  }
}

/** Settings for a new exercise appended at the end of `blockId`. */
export function selectStartingExerciseConfiguration(
  blocks: readonly WorkoutBlock[],
  blockId: string,
): StartingExerciseConfiguration {
  const blockIndex = blocks.findIndex((block) => block.id === blockId)

  if (blockIndex === -1) {
    return defaultStartingExerciseConfiguration()
  }

  const lastExercise = lastExerciseInBlock(blocks[blockIndex])
  const continuous =
    lastExercise?.configuration.mode === 'continuous' ? lastExercise.configuration : null

  return {
    mode: continuous ? 'continuous' : 'rounds',
    ...lastRoundsSettings(blocks, blockIndex),
    continuousDurationSeconds: continuous?.durationSeconds ?? DEFAULT_CONTINUOUS_DURATION_SECONDS,
  }
}

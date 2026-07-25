import type { WorkoutBlock, WorkoutBreak, WorkoutExercise } from '@/domain/workout/workout.types'
import type { WorkoutBuilderAction, WorkoutBuilderState } from '@/features/workout-builder/state/workoutBuilder.types'
import { areExerciseConfigurationsEqual } from '@/features/workout-builder/utils/exerciseConfigurationCompare'

export function createInitialWorkoutBuilderState(): WorkoutBuilderState {
  return {
    draft: {
      id: crypto.randomUUID(),
      disciplineKey: null,
      customName: null,
      mainGoal: null,
      blocks: [],
      createdAt: new Date().toISOString(),
    },
    disciplineLocked: false,
    isDirty: false,
  }
}

function findBlockIndex(blocks: readonly WorkoutBlock[], blockId: string): number {
  return blocks.findIndex((block) => block.id === blockId)
}

function moveInArray<T>(items: readonly T[], index: number, direction: 'up' | 'down'): T[] | null {
  const targetIndex = direction === 'up' ? index - 1 : index + 1

  if (targetIndex < 0 || targetIndex >= items.length) {
    return null
  }

  const nextItems = [...items]
  ;[nextItems[index], nextItems[targetIndex]] = [nextItems[targetIndex], nextItems[index]]
  return nextItems
}

function updateBlockAtIndex(
  blocks: readonly WorkoutBlock[],
  blockIndex: number,
  nextBlock: WorkoutBlock,
): WorkoutBlock[] {
  const nextBlocks = [...blocks]
  nextBlocks[blockIndex] = nextBlock
  return nextBlocks
}

export function workoutBuilderReducer(
  state: WorkoutBuilderState,
  action: WorkoutBuilderAction,
): WorkoutBuilderState {
  switch (action.type) {
    case 'setDiscipline': {
      if (state.disciplineLocked) {
        return state
      }

      if (state.draft.disciplineKey === action.disciplineKey) {
        return state
      }

      return {
        ...state,
        draft: {
          ...state.draft,
          disciplineKey: action.disciplineKey,
        },
        isDirty: true,
      }
    }
    case 'setCustomName': {
      if (state.draft.customName === action.customName) {
        return state
      }

      return {
        ...state,
        draft: {
          ...state.draft,
          customName: action.customName,
        },
        isDirty: true,
      }
    }
    case 'setMainGoal': {
      if (state.draft.mainGoal === action.mainGoal) {
        return state
      }

      return {
        ...state,
        draft: {
          ...state.draft,
          mainGoal: action.mainGoal,
        },
        isDirty: true,
      }
    }
    case 'addBlock': {
      return {
        ...state,
        draft: {
          ...state.draft,
          blocks: [...state.draft.blocks, action.block],
        },
        isDirty: true,
      }
    }
    case 'removeBlock': {
      const blockIndex = findBlockIndex(state.draft.blocks, action.blockId)

      if (blockIndex === -1) {
        return state
      }

      return {
        ...state,
        draft: {
          ...state.draft,
          blocks: state.draft.blocks.filter((block) => block.id !== action.blockId),
        },
        isDirty: true,
      }
    }
    case 'moveBlock': {
      const blockIndex = findBlockIndex(state.draft.blocks, action.blockId)

      if (blockIndex === -1) {
        return state
      }

      const nextBlocks = moveInArray(state.draft.blocks, blockIndex, action.direction)

      if (nextBlocks === null) {
        return state
      }

      return {
        ...state,
        draft: {
          ...state.draft,
          blocks: nextBlocks,
        },
        isDirty: true,
      }
    }
    case 'addBreak': {
      const blockIndex = findBlockIndex(state.draft.blocks, action.blockId)

      if (blockIndex === -1) {
        return state
      }

      const block = state.draft.blocks[blockIndex]

      return {
        ...state,
        draft: {
          ...state.draft,
          blocks: updateBlockAtIndex(state.draft.blocks, blockIndex, {
            ...block,
            items: [...block.items, action.breakItem],
          }),
        },
        isDirty: true,
      }
    }
    case 'addExercise': {
      if (state.draft.disciplineKey === null) {
        return state
      }

      const blockIndex = findBlockIndex(state.draft.blocks, action.blockId)

      if (blockIndex === -1) {
        return state
      }

      const block = state.draft.blocks[blockIndex]

      return {
        ...state,
        draft: {
          ...state.draft,
          blocks: updateBlockAtIndex(state.draft.blocks, blockIndex, {
            ...block,
            items: [...block.items, action.exercise],
          }),
        },
        disciplineLocked: true,
        isDirty: true,
      }
    }
    case 'updateExercise': {
      const blockIndex = findBlockIndex(state.draft.blocks, action.blockId)

      if (blockIndex === -1) {
        return state
      }

      const block = state.draft.blocks[blockIndex]
      const itemIndex = block.items.findIndex(
        (item): item is WorkoutExercise => item.id === action.exerciseId && item.type === 'exercise',
      )

      if (itemIndex === -1) {
        return state
      }

      const currentItem = block.items[itemIndex]

      if (currentItem.type !== 'exercise') {
        return state
      }

      if (
        areExerciseConfigurationsEqual(currentItem.configuration, action.configuration) &&
        currentItem.instruction === action.instruction
      ) {
        return state
      }

      const nextItems = [...block.items]
      nextItems[itemIndex] = {
        ...currentItem,
        configuration: action.configuration,
        instruction: action.instruction,
      }

      return {
        ...state,
        draft: {
          ...state.draft,
          blocks: updateBlockAtIndex(state.draft.blocks, blockIndex, {
            ...block,
            items: nextItems,
          }),
        },
        isDirty: true,
      }
    }
    case 'updateBreak': {
      const blockIndex = findBlockIndex(state.draft.blocks, action.blockId)

      if (blockIndex === -1) {
        return state
      }

      const block = state.draft.blocks[blockIndex]
      const itemIndex = block.items.findIndex(
        (item): item is WorkoutBreak => item.id === action.breakId && item.type === 'break',
      )

      if (itemIndex === -1) {
        return state
      }

      const currentItem = block.items[itemIndex]

      if (currentItem.type !== 'break') {
        return state
      }

      if (
        currentItem.durationSeconds === action.durationSeconds &&
        currentItem.instruction === action.instruction
      ) {
        return state
      }

      const nextItems = [...block.items]
      nextItems[itemIndex] = {
        ...currentItem,
        durationSeconds: action.durationSeconds,
        instruction: action.instruction,
      }

      return {
        ...state,
        draft: {
          ...state.draft,
          blocks: updateBlockAtIndex(state.draft.blocks, blockIndex, {
            ...block,
            items: nextItems,
          }),
        },
        isDirty: true,
      }
    }
    case 'removeItem': {
      const blockIndex = findBlockIndex(state.draft.blocks, action.blockId)

      if (blockIndex === -1) {
        return state
      }

      const block = state.draft.blocks[blockIndex]
      const itemExists = block.items.some((item) => item.id === action.itemId)

      if (!itemExists) {
        return state
      }

      return {
        ...state,
        draft: {
          ...state.draft,
          blocks: updateBlockAtIndex(state.draft.blocks, blockIndex, {
            ...block,
            items: block.items.filter((item) => item.id !== action.itemId),
          }),
        },
        isDirty: true,
      }
    }
    case 'moveItem': {
      const blockIndex = findBlockIndex(state.draft.blocks, action.blockId)

      if (blockIndex === -1) {
        return state
      }

      const block = state.draft.blocks[blockIndex]
      const itemIndex = block.items.findIndex((item) => item.id === action.itemId)

      if (itemIndex === -1) {
        return state
      }

      const nextItems = moveInArray(block.items, itemIndex, action.direction)

      if (nextItems === null) {
        return state
      }

      return {
        ...state,
        draft: {
          ...state.draft,
          blocks: updateBlockAtIndex(state.draft.blocks, blockIndex, {
            ...block,
            items: nextItems,
          }),
        },
        isDirty: true,
      }
    }
    default:
      return state
  }
}

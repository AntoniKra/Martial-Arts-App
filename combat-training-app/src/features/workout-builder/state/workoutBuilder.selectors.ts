import { getDisciplineLabelPl } from '@/domain/discipline/disciplineLabels'
import type { WorkoutBlock, WorkoutItem } from '@/domain/workout/workout.types'
import type { WorkoutBuilderState } from '@/features/workout-builder/state/workoutBuilder.types'

export function selectDisplayPlanName(state: WorkoutBuilderState): string {
  const trimmedCustomName = state.draft.customName?.trim() ?? ''

  if (trimmedCustomName.length > 0) {
    return trimmedCustomName
  }

  if (state.draft.disciplineKey !== null) {
    return `${getDisciplineLabelPl(state.draft.disciplineKey)} — plan treningu`
  }

  return 'Nowy plan treningowy'
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

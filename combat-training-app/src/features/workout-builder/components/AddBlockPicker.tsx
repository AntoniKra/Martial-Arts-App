import type { Dispatch } from 'react'

import type { WorkoutBlockType } from '@/domain/workout/workout.types'
import {
  getWorkoutBlockLabelPl,
  WORKOUT_BLOCK_TYPES,
} from '@/domain/workout/workoutBlockLabels'
import { CloseIcon } from '@/features/workout-builder/components/MoveIcons'
import { createWorkoutBlock } from '@/features/workout-builder/state/workoutBuilder.factories'
import type { WorkoutBuilderAction } from '@/features/workout-builder/state/workoutBuilder.types'

interface AddBlockPickerProps {
  isOpen: boolean
  onClose: () => void
  dispatch: Dispatch<WorkoutBuilderAction>
}

export function AddBlockPicker({ isOpen, onClose, dispatch }: AddBlockPickerProps) {
  if (!isOpen) {
    return null
  }

  function handleSelect(blockType: WorkoutBlockType) {
    dispatch({ type: 'addBlock', block: createWorkoutBlock(blockType) })
    onClose()
  }

  return (
    <div className="overflow-hidden border border-bd bg-surface">
      <div className="flex items-center justify-between border-b border-bd px-3 py-3">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
          Wybierz rodzaj bloku
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij wybór bloku"
          className="inline-flex min-h-touch min-w-touch items-center justify-center text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
        >
          <CloseIcon />
        </button>
      </div>
      <ul className="divide-y divide-bd">
        {WORKOUT_BLOCK_TYPES.map((blockType) => (
          <li key={blockType}>
            <button
              type="button"
              onClick={() => handleSelect(blockType)}
              className="flex min-h-touch w-full items-center px-4 py-3 text-left font-display text-[13px] font-semibold text-muted transition-colors hover:bg-elevated hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--app-focus-ring)]"
            >
              {getWorkoutBlockLabelPl(blockType)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

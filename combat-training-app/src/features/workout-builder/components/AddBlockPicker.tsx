import type { Dispatch } from 'react'

import type { WorkoutBlockType } from '@/domain/workout/workout.types'
import { TimelineCloseIcon } from '@/features/workout-builder/components/BlockTypeIcon'
import { BlockTypeTiles } from '@/features/workout-builder/components/BlockTypeTiles'
import { createWorkoutBlock } from '@/features/workout-builder/state/workoutBuilder.factories'
import type { WorkoutBuilderAction } from '@/features/workout-builder/state/workoutBuilder.types'
import { workoutBuilderLabels as labels } from '@/features/workout-builder/workoutBuilderLabels'

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
    <BlockTypeTiles
      heading={labels.chooseBlockType}
      featureWarmup={false}
      onSelect={handleSelect}
      headerAction={(
        <button type="button" onClick={onClose} aria-label={labels.closeBlockPicker} className="wb-tiles-close">
          <TimelineCloseIcon size={18} />
        </button>
      )}
    />
  )
}

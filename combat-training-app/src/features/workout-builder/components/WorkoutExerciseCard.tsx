import type { Dispatch } from 'react'
import { useId } from 'react'

import { useWorkoutData } from '@/application/workoutDataContext'
import type { WorkoutExercise, WorkoutItem } from '@/domain/workout/workout.types'
import { FocusSkillPicker } from '@/features/focus-skills/FocusSkillPicker'
import { RowActionIcon } from '@/features/workout-builder/components/BlockTypeIcon'
import type { FocusRestoreTarget } from '@/features/workout-builder/components/workoutBuilderUi.types'
import type { WorkoutBuilderAction } from '@/features/workout-builder/state/workoutBuilder.types'
import {
  canMoveItemDown,
  canMoveItemUp,
} from '@/features/workout-builder/state/workoutBuilder.selectors'
import { formatExerciseParams } from '@/features/workout-builder/utils/timelinePresentation'
import { workoutBuilderLabels as labels } from '@/features/workout-builder/workoutBuilderLabels'

interface WorkoutExerciseCardProps {
  blockId: string
  blockPosition: number
  blockLabel: string
  itemPosition: number
  exercise: WorkoutExercise
  focusExerciseCount: number
  blockItems: readonly WorkoutItem[]
  dispatch: Dispatch<WorkoutBuilderAction>
  isExpanded: boolean
  onToggle: () => void
  onOpenExerciseEdit: (blockId: string, exerciseId: string) => void
  onScheduleFocusRestore: (focusTarget: FocusRestoreTarget) => void
  registerExerciseHeadingRef: (element: HTMLHeadingElement | null) => void
  registerExerciseToggleRef: (element: HTMLButtonElement | null) => void
}

function formatExerciseContext(
  exerciseName: string,
  itemPosition: number,
  blockPosition: number,
  blockLabel: string,
): string {
  return `${exerciseName}, element ${itemPosition} w bloku ${blockPosition} — ${blockLabel}`
}

export function WorkoutExerciseCard({
  blockId,
  blockPosition,
  blockLabel,
  itemPosition,
  exercise,
  focusExerciseCount,
  blockItems,
  dispatch,
  isExpanded,
  onToggle,
  onOpenExerciseEdit,
  onScheduleFocusRestore,
  registerExerciseHeadingRef,
  registerExerciseToggleRef,
}: WorkoutExerciseCardProps) {
  const panelId = useId()
  const { focusSkills } = useWorkoutData()
  const exerciseContext = formatExerciseContext(
    exercise.exerciseNameSnapshot,
    itemPosition,
    blockPosition,
    blockLabel,
  )
  const canMoveUp = canMoveItemUp(blockItems, exercise.id)
  const canMoveDown = canMoveItemDown(blockItems, exercise.id)
  const addExerciseFocusTarget: FocusRestoreTarget = { type: 'addExercise', blockId }
  const focusSkill = exercise.focusSkillId === null
    ? undefined
    : focusSkills.items.find((skill) => skill.id === exercise.focusSkillId)

  return (
    <li className={`wb-row${isExpanded ? ' is-expanded' : ''}`}>
      <div className="wb-row-main">
        <span className="wb-node" aria-hidden="true" />
        <div className="wb-row-text">
          <h4 ref={registerExerciseHeadingRef} tabIndex={-1} className="wb-row-name">
            {exercise.exerciseNameSnapshot}
          </h4>
          <p className="wb-row-details">
            <span className="wb-row-params">{formatExerciseParams(exercise.configuration, labels.continuous)}</span>
            {focusSkill ? <span className="wb-row-focus">· {labels.focusMark} {focusSkill.name}</span> : null}
          </p>
        </div>
        <button
          ref={registerExerciseToggleRef}
          type="button"
          className="wb-row-toggle"
          aria-label={labels.exerciseActions(exerciseContext)}
          aria-expanded={isExpanded}
          aria-controls={isExpanded ? panelId : undefined}
          onClick={onToggle}
        >
          <span aria-hidden="true">⋯</span>
        </button>
      </div>

      {isExpanded ? (
        <div id={panelId} className="wb-row-panel">
          <div className="wb-actions">
            <button
              type="button"
              className="wb-action wb-focusable"
              aria-label={`Przenieś ćwiczenie ${exerciseContext} w górę`}
              disabled={!canMoveUp}
              onClick={() => dispatch({ type: 'moveItem', blockId, itemId: exercise.id, direction: 'up' })}
            >
              <RowActionIcon action="up" />
              <span>{labels.moveUp}</span>
            </button>
            <button
              type="button"
              className="wb-action wb-focusable"
              aria-label={`Przenieś ćwiczenie ${exerciseContext} w dół`}
              disabled={!canMoveDown}
              onClick={() => dispatch({ type: 'moveItem', blockId, itemId: exercise.id, direction: 'down' })}
            >
              <RowActionIcon action="down" />
              <span>{labels.moveDown}</span>
            </button>
            <button
              type="button"
              className="wb-action wb-focusable"
              aria-label={`Edytuj ćwiczenie ${exerciseContext}`}
              onClick={() => onOpenExerciseEdit(blockId, exercise.id)}
            >
              <RowActionIcon action="edit" />
              <span>{labels.edit}</span>
            </button>
            <button
              type="button"
              className="wb-action is-danger wb-focusable"
              aria-label={`Usuń ćwiczenie ${exerciseContext}`}
              onClick={() => {
                dispatch({ type: 'removeItem', blockId, itemId: exercise.id })
                onScheduleFocusRestore(addExerciseFocusTarget)
              }}
            >
              <RowActionIcon action="remove" />
              <span>{labels.remove}</span>
            </button>
          </div>
          {exercise.instruction ? <p className="wb-panel-note">{exercise.instruction}</p> : null}
          <FocusSkillPicker
            focusSkillId={exercise.focusSkillId}
            focusExerciseCount={focusExerciseCount}
            exerciseId={exercise.combinationId}
            onChange={(focusSkillId) => dispatch({ type: 'setExerciseFocusSkill', blockId, exerciseId: exercise.id, focusSkillId })}
          />
        </div>
      ) : null}
    </li>
  )
}

import type { Dispatch } from 'react'
import { useId } from 'react'

import type { WorkoutBreak, WorkoutItem } from '@/domain/workout/workout.types'
import { RowActionIcon } from '@/features/workout-builder/components/BlockTypeIcon'
import { TimelineBreakMain } from '@/features/workout-builder/components/TimelineParts'
import type {
  ActiveInlinePanel,
  FocusRestoreTarget,
} from '@/features/workout-builder/components/workoutBuilderUi.types'
import type { WorkoutBuilderAction } from '@/features/workout-builder/state/workoutBuilder.types'
import {
  canMoveItemDown,
  canMoveItemUp,
} from '@/features/workout-builder/state/workoutBuilder.selectors'
import { workoutBuilderLabels as labels } from '@/features/workout-builder/workoutBuilderLabels'

interface WorkoutBreakCardProps {
  blockId: string
  blockPosition: number
  blockLabel: string
  itemPosition: number
  breakItem: WorkoutBreak
  blockItems: readonly WorkoutItem[]
  dispatch: Dispatch<WorkoutBuilderAction>
  activeInlinePanel: ActiveInlinePanel
  isExpanded: boolean
  onToggle: () => void
  onOpenInlinePanel: (panel: Exclude<ActiveInlinePanel, null>) => void
  onScheduleFocusRestore: (focusTarget: FocusRestoreTarget) => void
  registerEditBreakButtonRef: (element: HTMLButtonElement | null) => void
}

function formatBreakContext(
  itemPosition: number,
  blockPosition: number,
  blockLabel: string,
): string {
  return `element ${itemPosition} w bloku ${blockPosition} — ${blockLabel}`
}

export function WorkoutBreakCard({
  blockId,
  blockPosition,
  blockLabel,
  itemPosition,
  breakItem,
  blockItems,
  dispatch,
  activeInlinePanel,
  isExpanded,
  onToggle,
  onOpenInlinePanel,
  onScheduleFocusRestore,
  registerEditBreakButtonRef,
}: WorkoutBreakCardProps) {
  const panelId = useId()
  const breakContext = formatBreakContext(itemPosition, blockPosition, blockLabel)
  const canMoveUp = canMoveItemUp(blockItems, breakItem.id)
  const canMoveDown = canMoveItemDown(blockItems, breakItem.id)
  const addBreakFocusTarget: FocusRestoreTarget = { type: 'addBreak', blockId }

  const isEditing =
    activeInlinePanel?.type === 'editBreak' &&
    activeInlinePanel.blockId === blockId &&
    activeInlinePanel.itemId === breakItem.id

  return (
    <li className={`wb-break-item${isExpanded ? ' is-expanded' : ''}${isEditing ? ' is-active' : ''}`}>
      <TimelineBreakMain
        breakItem={breakItem}
        action={
          <button
            ref={registerEditBreakButtonRef}
            type="button"
            className="wb-row-toggle"
            aria-label={labels.breakActions(breakContext)}
            aria-expanded={isExpanded}
            aria-controls={isExpanded ? panelId : undefined}
            onClick={onToggle}
          >
            <span aria-hidden="true">⋯</span>
          </button>
        }
      />

      {isExpanded ? (
        <div id={panelId} className="wb-row-panel">
          <div className="wb-actions">
            <button
              type="button"
              className="wb-action"
              aria-label={`Przenieś przerwę, ${breakContext} w górę`}
              disabled={!canMoveUp}
              onClick={() => dispatch({ type: 'moveItem', blockId, itemId: breakItem.id, direction: 'up' })}
            >
              <RowActionIcon action="up" />
              <span>{labels.moveUp}</span>
            </button>
            <button
              type="button"
              className="wb-action"
              aria-label={`Przenieś przerwę, ${breakContext} w dół`}
              disabled={!canMoveDown}
              onClick={() => dispatch({ type: 'moveItem', blockId, itemId: breakItem.id, direction: 'down' })}
            >
              <RowActionIcon action="down" />
              <span>{labels.moveDown}</span>
            </button>
            <button
              type="button"
              className="wb-action"
              aria-haspopup="dialog"
              aria-label={`Edytuj przerwę, ${breakContext}`}
              onClick={() => onOpenInlinePanel({ type: 'editBreak', blockId, itemId: breakItem.id })}
            >
              <RowActionIcon action="edit" />
              <span>{labels.edit}</span>
            </button>
            <button
              type="button"
              className="wb-action is-danger"
              aria-label={`Usuń przerwę, ${breakContext}`}
              onClick={() => {
                dispatch({ type: 'removeItem', blockId, itemId: breakItem.id })
                onScheduleFocusRestore(addBreakFocusTarget)
              }}
            >
              <RowActionIcon action="remove" />
              <span>{labels.remove}</span>
            </button>
          </div>
          {breakItem.instruction ? <p className="wb-panel-note">{breakItem.instruction}</p> : null}
        </div>
      ) : null}
    </li>
  )
}

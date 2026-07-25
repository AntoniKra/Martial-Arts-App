import type { Dispatch } from 'react'

import { Button } from '@/components/ui/Button'
import type { WorkoutBreak, WorkoutItem } from '@/domain/workout/workout.types'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  MoveIconButton,
} from '@/features/workout-builder/components/MoveIcons'
import {
  formatBreakDuration,
  WorkoutBreakForm,
} from '@/features/workout-builder/components/WorkoutBreakForm'
import type {
  ActiveInlinePanel,
  FocusRestoreTarget,
} from '@/features/workout-builder/components/workoutBuilderUi.types'
import type { WorkoutBuilderAction } from '@/features/workout-builder/state/workoutBuilder.types'
import {
  canMoveItemDown,
  canMoveItemUp,
} from '@/features/workout-builder/state/workoutBuilder.selectors'

interface WorkoutBreakCardProps {
  blockId: string
  blockPosition: number
  blockLabel: string
  itemPosition: number
  breakItem: WorkoutBreak
  blockItems: readonly WorkoutItem[]
  dispatch: Dispatch<WorkoutBuilderAction>
  activeInlinePanel: ActiveInlinePanel
  onOpenInlinePanel: (panel: Exclude<ActiveInlinePanel, null>) => void
  onCloseInlinePanel: (focusTarget?: FocusRestoreTarget) => void
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
  onOpenInlinePanel,
  onCloseInlinePanel,
  onScheduleFocusRestore,
  registerEditBreakButtonRef,
}: WorkoutBreakCardProps) {
  const breakContext = formatBreakContext(itemPosition, blockPosition, blockLabel)
  const canMoveUp = canMoveItemUp(blockItems, breakItem.id)
  const canMoveDown = canMoveItemDown(blockItems, breakItem.id)
  const editBreakFocusTarget: FocusRestoreTarget = { type: 'editBreak', itemId: breakItem.id }
  const addBreakFocusTarget: FocusRestoreTarget = { type: 'addBreak', blockId }

  const isEditing =
    activeInlinePanel?.type === 'editBreak' &&
    activeInlinePanel.blockId === blockId &&
    activeInlinePanel.itemId === breakItem.id

  if (isEditing) {
    return (
      <li className="border-t border-bd bg-bg/40 p-3">
        <WorkoutBreakForm
          mode="edit"
          initialDurationSeconds={breakItem.durationSeconds}
          initialInstruction={breakItem.instruction}
          onCancel={() => onCloseInlinePanel(editBreakFocusTarget)}
          onSubmit={(durationSeconds, instruction) => {
            dispatch({
              type: 'updateBreak',
              blockId,
              breakId: breakItem.id,
              durationSeconds,
              instruction,
            })
            onCloseInlinePanel(editBreakFocusTarget)
          }}
        />
      </li>
    )
  }

  return (
    <li className="border-t border-bd px-3 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[13px] font-semibold text-ink">Przerwa</p>
          <p className="mt-0.5 font-display text-[12px] text-muted">{formatBreakDuration(breakItem.durationSeconds)}</p>
          {breakItem.instruction ? (
            <p className="mt-1 text-[12px] leading-relaxed text-muted">{breakItem.instruction}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-0.5">
          <MoveIconButton
            ref={registerEditBreakButtonRef}
            label={`Edytuj przerwę, ${breakContext}`}
            onClick={() => onOpenInlinePanel({ type: 'editBreak', blockId, itemId: breakItem.id })}
          >
            <span className="font-display text-[10px] font-semibold uppercase tracking-[0.08em]">Edytuj</span>
          </MoveIconButton>
          <MoveIconButton
            label={`Przenieś przerwę, ${breakContext} w górę`}
            disabled={!canMoveUp}
            onClick={() => dispatch({ type: 'moveItem', blockId, itemId: breakItem.id, direction: 'up' })}
          >
            <ArrowUpIcon />
          </MoveIconButton>
          <MoveIconButton
            label={`Przenieś przerwę, ${breakContext} w dół`}
            disabled={!canMoveDown}
            onClick={() => dispatch({ type: 'moveItem', blockId, itemId: breakItem.id, direction: 'down' })}
          >
            <ArrowDownIcon />
          </MoveIconButton>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-h-touch px-2 text-crimson hover:text-crimson"
            aria-label={`Usuń przerwę, ${breakContext}`}
            onClick={() => {
              dispatch({ type: 'removeItem', blockId, itemId: breakItem.id })
              onScheduleFocusRestore(addBreakFocusTarget)
            }}
          >
            Usuń
          </Button>
        </div>
      </div>
    </li>
  )
}

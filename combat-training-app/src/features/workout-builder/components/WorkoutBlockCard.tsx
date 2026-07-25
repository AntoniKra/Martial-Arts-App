import type { Dispatch } from 'react'
import { useId } from 'react'

import { Button } from '@/components/ui/Button'
import type { WorkoutBlock } from '@/domain/workout/workout.types'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  MoveIconButton,
  PlusIcon,
  TrashIcon,
} from '@/features/workout-builder/components/MoveIcons'
import { WorkoutBreakCard } from '@/features/workout-builder/components/WorkoutBreakCard'
import { WorkoutBreakForm } from '@/features/workout-builder/components/WorkoutBreakForm'
import { WorkoutExerciseCard } from '@/features/workout-builder/components/WorkoutExerciseCard'
import type {
  ActiveInlinePanel,
  FocusRestoreTarget,
} from '@/features/workout-builder/components/workoutBuilderUi.types'
import { createWorkoutBreak } from '@/features/workout-builder/state/workoutBuilder.factories'
import type { WorkoutBuilderAction } from '@/features/workout-builder/state/workoutBuilder.types'
import {
  canMoveBlockDown,
  canMoveBlockUp,
} from '@/features/workout-builder/state/workoutBuilder.selectors'
import { formatPolishCount } from '@/features/workout-builder/utils/polishPlural'

interface WorkoutBlockCardProps {
  block: WorkoutBlock
  position: number
  allBlocks: readonly WorkoutBlock[]
  dispatch: Dispatch<WorkoutBuilderAction>
  canAddExercise: boolean
  activeInlinePanel: ActiveInlinePanel
  onOpenInlinePanel: (panel: Exclude<ActiveInlinePanel, null>) => void
  onCloseInlinePanel: (focusTarget?: FocusRestoreTarget) => void
  onScheduleFocusRestore: (focusTarget: FocusRestoreTarget) => void
  onOpenExerciseLibrary: (blockId: string) => void
  onOpenExerciseEdit: (blockId: string, exerciseId: string) => void
  registerAddBreakButtonRef: (element: HTMLButtonElement | null) => void
  registerAddExerciseButtonRef: (element: HTMLButtonElement | null) => void
  registerEditBreakButtonRef: (itemId: string) => (element: HTMLButtonElement | null) => void
  registerExerciseHeadingRef: (exerciseId: string) => (element: HTMLHeadingElement | null) => void
  registerEditExerciseButtonRef: (exerciseId: string) => (element: HTMLButtonElement | null) => void
}

function formatBlockDescriptor(position: number, blockLabel: string): string {
  return `blok ${position} — ${blockLabel}`
}

export function WorkoutBlockCard({
  block,
  position,
  allBlocks,
  dispatch,
  canAddExercise,
  activeInlinePanel,
  onOpenInlinePanel,
  onCloseInlinePanel,
  onScheduleFocusRestore,
  onOpenExerciseLibrary,
  onOpenExerciseEdit,
  registerAddBreakButtonRef,
  registerAddExerciseButtonRef,
  registerEditBreakButtonRef,
  registerExerciseHeadingRef,
  registerEditExerciseButtonRef,
}: WorkoutBlockCardProps) {
  const addExerciseHintId = useId()
  const blockLabel = getWorkoutBlockLabelPl(block.blockType)
  const blockDescriptor = formatBlockDescriptor(position, blockLabel)
  const canMoveUp = canMoveBlockUp(allBlocks, block.id)
  const canMoveDown = canMoveBlockDown(allBlocks, block.id)
  const isEmpty = block.items.length === 0
  const addBreakFocusTarget: FocusRestoreTarget = { type: 'addBreak', blockId: block.id }

  const isAddingBreak =
    activeInlinePanel?.type === 'addBreak' && activeInlinePanel.blockId === block.id
  const isConfirmingDelete =
    activeInlinePanel?.type === 'confirmBlockDelete' && activeInlinePanel.blockId === block.id

  function handleDelete() {
    if (isEmpty) {
      dispatch({ type: 'removeBlock', blockId: block.id })
      onScheduleFocusRestore({ type: 'addBlock' })
      return
    }

    onOpenInlinePanel({
      type: 'confirmBlockDelete',
      blockId: block.id,
      itemCountAtOpen: block.items.length,
    })
  }

  return (
    <li className="overflow-hidden border border-bd bg-surface">
      <div className="flex flex-col gap-3 border-b border-bd bg-elevated px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
            Blok {position}
          </p>
          <p className="mt-1 font-display text-[14px] font-semibold text-ink">{blockLabel}</p>
          <p className="mt-0.5 text-[12px] text-muted">
            {formatPolishCount(block.items.length, 'element', 'elementy', 'elementów')}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-0.5">
          <MoveIconButton
            label={`Przenieś ${blockDescriptor} w górę`}
            disabled={!canMoveUp}
            onClick={() => dispatch({ type: 'moveBlock', blockId: block.id, direction: 'up' })}
          >
            <ArrowUpIcon />
          </MoveIconButton>
          <MoveIconButton
            label={`Przenieś ${blockDescriptor} w dół`}
            disabled={!canMoveDown}
            onClick={() => dispatch({ type: 'moveBlock', blockId: block.id, direction: 'down' })}
          >
            <ArrowDownIcon />
          </MoveIconButton>
          {!isConfirmingDelete ? (
            <MoveIconButton
              label={`Usuń blok ${position} — ${blockLabel}`}
              className="hover:text-crimson"
              onClick={handleDelete}
            >
              <TrashIcon />
            </MoveIconButton>
          ) : null}
        </div>
      </div>

      {isConfirmingDelete ? (
        <div className="border-b border-bd bg-bg/40 px-3 py-3">
          <p className="text-[13px] leading-relaxed text-muted">
            Usunięty zostanie blok wraz ze wszystkimi jego elementami.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => onCloseInlinePanel()}>
              Anuluj
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              aria-label={`Potwierdź usunięcie ${blockDescriptor}`}
              onClick={() => {
                dispatch({ type: 'removeBlock', blockId: block.id })
                onCloseInlinePanel({ type: 'addBlock' })
              }}
            >
              Usuń blok
            </Button>
          </div>
        </div>
      ) : null}

      {block.items.length > 0 ? (
        <ul aria-label={`Elementy ${blockDescriptor}`}>
          {block.items.map((item, itemIndex) => {
            if (item.type === 'break') {
              return (
                <WorkoutBreakCard
                  key={item.id}
                  blockId={block.id}
                  blockPosition={position}
                  blockLabel={blockLabel}
                  itemPosition={itemIndex + 1}
                  breakItem={item}
                  blockItems={block.items}
                  dispatch={dispatch}
                  activeInlinePanel={activeInlinePanel}
                  onOpenInlinePanel={onOpenInlinePanel}
                  onCloseInlinePanel={onCloseInlinePanel}
                  onScheduleFocusRestore={onScheduleFocusRestore}
                  registerEditBreakButtonRef={registerEditBreakButtonRef(item.id)}
                />
              )
            }

            return (
              <WorkoutExerciseCard
                key={item.id}
                blockId={block.id}
                blockPosition={position}
                blockLabel={blockLabel}
                itemPosition={itemIndex + 1}
                exercise={item}
                blockItems={block.items}
                dispatch={dispatch}
                onOpenExerciseEdit={onOpenExerciseEdit}
                onScheduleFocusRestore={onScheduleFocusRestore}
                registerExerciseHeadingRef={registerExerciseHeadingRef(item.id)}
                registerEditExerciseButtonRef={registerEditExerciseButtonRef(item.id)}
              />
            )
          })}
        </ul>
      ) : null}

      <div className="border-t border-bd">
        <button
          ref={registerAddExerciseButtonRef}
          type="button"
          disabled={!canAddExercise}
          aria-label={`Dodaj ćwiczenie do ${blockDescriptor}`}
          aria-describedby={canAddExercise ? undefined : addExerciseHintId}
          onClick={() => onOpenExerciseLibrary(block.id)}
          className="flex min-h-touch w-full items-center justify-center gap-2 px-4 py-3 font-display text-[11px] font-semibold uppercase tracking-[0.06em] text-muted transition-colors hover:bg-elevated hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--app-focus-ring)]"
        >
          <PlusIcon />
          Dodaj ćwiczenie
        </button>
        {!canAddExercise ? (
          <p id={addExerciseHintId} className="border-t border-bd px-4 py-2 text-[12px] text-muted">
            Najpierw wybierz dyscyplinę.
          </p>
        ) : null}

        {isAddingBreak ? (
          <div className="border-t border-bd p-3">
            <WorkoutBreakForm
              mode="add"
              onCancel={() => onCloseInlinePanel(addBreakFocusTarget)}
              onSubmit={(durationSeconds, instruction) => {
                dispatch({
                  type: 'addBreak',
                  blockId: block.id,
                  breakItem: createWorkoutBreak(durationSeconds, instruction),
                })
                onCloseInlinePanel(addBreakFocusTarget)
              }}
            />
          </div>
        ) : (
          <button
            ref={registerAddBreakButtonRef}
            type="button"
            aria-label={`Dodaj przerwę do ${blockDescriptor}`}
            onClick={() => onOpenInlinePanel({ type: 'addBreak', blockId: block.id })}
            className="flex min-h-touch w-full items-center justify-center gap-2 border-t border-bd px-4 py-3 font-display text-[11px] font-semibold uppercase tracking-[0.06em] text-muted transition-colors hover:bg-elevated hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--app-focus-ring)]"
          >
            <PlusIcon />
            Dodaj przerwę
          </button>
        )}
      </div>
    </li>
  )
}

import { actionLabels } from '@/components/ui/actionLabels'
import type { Dispatch } from 'react'
import { useId } from 'react'

import { Button } from '@/components/ui/Button'
import type { WorkoutBlock } from '@/domain/workout/workout.types'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { formatSecondsAsClock } from '@/domain/time/formatDuration'
import {
  RowActionIcon,
  TimelineClockIcon,
  TimelinePlusIcon,
} from '@/features/workout-builder/components/BlockTypeIcon'
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
import {
  splitTrailingBreaks,
  summarizeBlockTime,
  type PositionedItem,
} from '@/features/workout-builder/utils/timelinePresentation'
import { workoutBuilderLabels as labels } from '@/features/workout-builder/workoutBuilderLabels'
import { countFocusExercises } from '@/domain/focus-skill/focusSkillSelectors'

interface WorkoutBlockCardProps {
  block: WorkoutBlock
  position: number
  allBlocks: readonly WorkoutBlock[]
  dispatch: Dispatch<WorkoutBuilderAction>
  canAddExercise: boolean
  activeInlinePanel: ActiveInlinePanel
  expandedId: string | null
  onToggleExpanded: (id: string) => void
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

/** "blok 1 — Technika" for accusative use ("Przenieś blok 1"). */
function formatBlockDescriptor(position: number, blockLabel: string): string {
  return `blok ${position} — ${blockLabel}`
}

/** "bloku 1 — Technika" for genitive use ("Dodaj ćwiczenie do bloku 1"). */
function formatBlockDescriptorGenitive(position: number, blockLabel: string): string {
  return `bloku ${position} — ${blockLabel}`
}

/** Expanded-row key of the block menu; item keys are item ids. */
function blockMenuKey(blockId: string): string {
  return `block:${blockId}`
}

export function WorkoutBlockCard({
  block,
  position,
  allBlocks,
  dispatch,
  canAddExercise,
  activeInlinePanel,
  expandedId,
  onToggleExpanded,
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
  const blockMenuId = useId()
  const blockLabel = getWorkoutBlockLabelPl(block.blockType)
  const blockDescriptor = formatBlockDescriptor(position, blockLabel)
  const blockDescriptorGenitive = formatBlockDescriptorGenitive(position, blockLabel)
  const canMoveUp = canMoveBlockUp(allBlocks, block.id)
  const canMoveDown = canMoveBlockDown(allBlocks, block.id)
  const isEmpty = block.items.length === 0
  const focusExerciseCount = countFocusExercises(allBlocks)
  const addBreakFocusTarget: FocusRestoreTarget = { type: 'addBreak', blockId: block.id }
  const time = summarizeBlockTime(block)
  const { inside, trailing } = splitTrailingBreaks(block.items)
  const isMenuOpen = expandedId === blockMenuKey(block.id)

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

  function renderItem({ item, position: itemPosition }: PositionedItem) {
    if (item.type === 'break') {
      return (
        <WorkoutBreakCard
          key={item.id}
          blockId={block.id}
          blockPosition={position}
          blockLabel={blockLabel}
          itemPosition={itemPosition}
          breakItem={item}
          blockItems={block.items}
          dispatch={dispatch}
          activeInlinePanel={activeInlinePanel}
          isExpanded={expandedId === item.id}
          onToggle={() => onToggleExpanded(item.id)}
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
        itemPosition={itemPosition}
        exercise={item}
        focusExerciseCount={focusExerciseCount}
        blockItems={block.items}
        dispatch={dispatch}
        isExpanded={expandedId === item.id}
        onToggle={() => onToggleExpanded(item.id)}
        onOpenExerciseEdit={onOpenExerciseEdit}
        onScheduleFocusRestore={onScheduleFocusRestore}
        registerExerciseHeadingRef={registerExerciseHeadingRef(item.id)}
        registerExerciseToggleRef={registerEditExerciseButtonRef(item.id)}
      />
    )
  }

  return (
    <li className="wb-block-entry">
      <section className="wb-block" aria-label={labels.blockHeading(position, blockLabel)}>
        <header className="wb-block-header">
          <div className="wb-block-header-top">
            <h3 className="wb-block-name">{labels.blockHeading(position, blockLabel)}</h3>
            <span className="wb-block-total">
              {formatSecondsAsClock(time.totalSeconds)}
              <button
                type="button"
                className="wb-block-menu"
                aria-label={labels.blockActions(blockDescriptor)}
                aria-expanded={isMenuOpen}
                aria-controls={isMenuOpen ? blockMenuId : undefined}
                onClick={() => onToggleExpanded(blockMenuKey(block.id))}
              >
                <span aria-hidden="true">⋯</span>
              </button>
            </span>
          </div>
          <div className="wb-ratio-bar" role="img" aria-label={labels.blockRatio(formatSecondsAsClock(time.workSeconds), formatSecondsAsClock(time.restSeconds))}>
            <div className="wb-ratio-work" style={{ width: `${time.workPercent}%` }} />
            <div className="wb-ratio-rest" style={{ width: `${time.restPercent}%` }} />
          </div>
          <div className="wb-ratio-labels" aria-hidden="true">
            <span>{labels.blockWork(formatSecondsAsClock(time.workSeconds))}</span>
            <span>{labels.blockRest(formatSecondsAsClock(time.restSeconds))}</span>
          </div>
        </header>

        {isMenuOpen && !isConfirmingDelete ? (
          <div id={blockMenuId} className="wb-row-panel">
            <div className="wb-actions is-three">
              <button
                type="button"
                className="wb-action"
                aria-label={`Przenieś ${blockDescriptor} w górę`}
                disabled={!canMoveUp}
                onClick={() => dispatch({ type: 'moveBlock', blockId: block.id, direction: 'up' })}
              >
                <RowActionIcon action="up" />
                <span>{labels.moveUp}</span>
              </button>
              <button
                type="button"
                className="wb-action"
                aria-label={`Przenieś ${blockDescriptor} w dół`}
                disabled={!canMoveDown}
                onClick={() => dispatch({ type: 'moveBlock', blockId: block.id, direction: 'down' })}
              >
                <RowActionIcon action="down" />
                <span>{labels.moveDown}</span>
              </button>
              <button
                type="button"
                className="wb-action is-danger"
                aria-label={`Usuń blok ${position} — ${blockLabel}`}
                onClick={handleDelete}
              >
                <RowActionIcon action="remove" />
                <span>{labels.remove}</span>
              </button>
            </div>
          </div>
        ) : null}

        {isConfirmingDelete ? (
          <div className="wb-row-panel">
            <p className="wb-panel-note">{labels.confirmBlockDelete}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => onCloseInlinePanel()}>
                {actionLabels.cancel}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="danger"
                aria-label={`Usuń ${blockDescriptor}`}
                onClick={() => {
                  dispatch({ type: 'removeBlock', blockId: block.id })
                  onCloseInlinePanel({ type: 'addBlock' })
                }}
              >
                {labels.deleteBlock}
              </Button>
            </div>
          </div>
        ) : null}

        {inside.length > 0 ? (
          <ul className="wb-items" aria-label={labels.blockItems(blockDescriptorGenitive)}>
            {inside.map(renderItem)}
          </ul>
        ) : null}

        <div className="wb-block-footer">
          <button
            ref={registerAddExerciseButtonRef}
            type="button"
            disabled={!canAddExercise}
            aria-label={`Dodaj ćwiczenie do ${blockDescriptorGenitive}`}
            aria-describedby={canAddExercise ? undefined : addExerciseHintId}
            onClick={() => onOpenExerciseLibrary(block.id)}
            className="wb-footer-action"
          >
            <TimelinePlusIcon size={14} strokeWidth={2.6} />
            <span>{labels.addExercise}</span>
          </button>
          <button
            ref={registerAddBreakButtonRef}
            type="button"
            aria-label={`Dodaj przerwę do ${blockDescriptorGenitive}`}
            aria-expanded={isAddingBreak}
            onClick={() => onOpenInlinePanel({ type: 'addBreak', blockId: block.id })}
            className="wb-footer-action"
          >
            <TimelineClockIcon />
            <span>{labels.addBreak}</span>
          </button>
        </div>
        {!canAddExercise ? (
          <p id={addExerciseHintId} className="wb-block-note">{labels.chooseDisciplineFirst}</p>
        ) : null}

        {isAddingBreak ? (
          <div className="wb-block-form">
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
        ) : null}
      </section>

      {trailing.length > 0 ? (
        <ul className="wb-trailing" aria-label={labels.breaksAfterBlock(blockDescriptorGenitive)}>
          {trailing.map(renderItem)}
        </ul>
      ) : null}
    </li>
  )
}

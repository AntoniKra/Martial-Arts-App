import type { Dispatch } from 'react'
import { useEffect, useRef, useState } from 'react'

import type { WorkoutBlockType } from '@/domain/workout/workout.types'
import { AddBlockPicker } from '@/features/workout-builder/components/AddBlockPicker'
import { TimelinePlusIcon } from '@/features/workout-builder/components/BlockTypeIcon'
import { BlockTypeTiles } from '@/features/workout-builder/components/BlockTypeTiles'
import type {
  ActiveInlinePanel,
  FocusRestoreTarget,
} from '@/features/workout-builder/components/workoutBuilderUi.types'
import { WorkoutBlockCard } from '@/features/workout-builder/components/WorkoutBlockCard'
import { WorkoutBreakSheet } from '@/features/workout-builder/components/WorkoutBreakSheet'
import { createWorkoutBlock, createWorkoutBreak } from '@/features/workout-builder/state/workoutBuilder.factories'
import type {
  WorkoutBuilderAction,
  WorkoutBuilderState,
} from '@/features/workout-builder/state/workoutBuilder.types'
import type { WorkoutBlock } from '@/domain/workout/workout.types'
import { workoutBuilderLabels as labels } from '@/features/workout-builder/workoutBuilderLabels'

interface WorkoutTimelineProps {
  state: WorkoutBuilderState
  dispatch: Dispatch<WorkoutBuilderAction>
  onOpenExerciseLibrary: (blockId: string) => void
  onOpenExerciseEdit: (blockId: string, exerciseId: string) => void
  pendingAddedExerciseId: string | null
  onPendingAddedExerciseFocusHandled: () => void
  pendingAddExerciseBlockId: string | null
  onPendingAddExerciseFocusHandled: () => void
  pendingEditExerciseId: string | null
  onPendingEditExerciseFocusHandled: () => void
}

function resolveActiveInlinePanel(blocks: readonly WorkoutBlock[], panel: ActiveInlinePanel): ActiveInlinePanel {
  if (panel === null) {
    return null
  }

  const block = blocks.find((candidate) => candidate.id === panel.blockId)

  if (!block) {
    return null
  }

  if (panel.type === 'editBreak') {
    const item = block.items.find((candidate) => candidate.id === panel.itemId)

    if (!item || item.type !== 'break') {
      return null
    }
  }

  if (panel.type === 'confirmBlockDelete' && block.items.length !== panel.itemCountAtOpen) {
    return null
  }

  return panel
}

export function WorkoutTimeline({
  state,
  dispatch,
  onOpenExerciseLibrary,
  onOpenExerciseEdit,
  pendingAddedExerciseId,
  onPendingAddedExerciseFocusHandled,
  pendingAddExerciseBlockId,
  onPendingAddExerciseFocusHandled,
  pendingEditExerciseId,
  onPendingEditExerciseFocusHandled,
}: WorkoutTimelineProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [activeInlinePanel, setActiveInlinePanel] = useState<ActiveInlinePanel>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pendingFocus, setPendingFocus] = useState<FocusRestoreTarget | null>(null)
  const addBlockButtonRef = useRef<HTMLButtonElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const addBreakButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const addExerciseButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const editBreakButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const exerciseHeadingRefs = useRef(new Map<string, HTMLHeadingElement>())
  const editExerciseButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const { blocks } = state.draft
  const canAddExercise = state.draft.disciplineKey !== null

  const resolvedPanel = resolveActiveInlinePanel(blocks, activeInlinePanel)
  if (resolvedPanel !== activeInlinePanel) setActiveInlinePanel(resolvedPanel)

  useEffect(() => {
    if (!pendingFocus) {
      return
    }

    const frame = requestAnimationFrame(() => {
      switch (pendingFocus.type) {
        case 'addBlock':
          // With no blocks left, the first block tile takes the place of the add button.
          (addBlockButtonRef.current ?? sectionRef.current?.querySelector<HTMLButtonElement>('.wb-tile'))?.focus()
          break
        case 'addBreak':
          addBreakButtonRefs.current.get(pendingFocus.blockId)?.focus()
          break
        case 'addExercise':
          addExerciseButtonRefs.current.get(pendingFocus.blockId)?.focus()
          break
        case 'editBreak':
          editBreakButtonRefs.current.get(pendingFocus.itemId)?.focus()
          break
        case 'addedExercise':
          exerciseHeadingRefs.current.get(pendingFocus.exerciseId)?.focus()
          break
        case 'editExercise':
          editExerciseButtonRefs.current.get(pendingFocus.exerciseId)?.focus()
          break
      }

      setPendingFocus(null)
    })

    return () => cancelAnimationFrame(frame)
  }, [pendingFocus])

  useEffect(() => {
    if (!pendingAddedExerciseId) {
      return
    }

    scheduleFocusRestore({ type: 'addedExercise', exerciseId: pendingAddedExerciseId })
    onPendingAddedExerciseFocusHandled()
  }, [pendingAddedExerciseId, onPendingAddedExerciseFocusHandled])

  useEffect(() => {
    if (!pendingAddExerciseBlockId) {
      return
    }

    scheduleFocusRestore({ type: 'addExercise', blockId: pendingAddExerciseBlockId })
    onPendingAddExerciseFocusHandled()
  }, [pendingAddExerciseBlockId, onPendingAddExerciseFocusHandled])

  useEffect(() => {
    if (!pendingEditExerciseId) {
      return
    }

    scheduleFocusRestore({ type: 'editExercise', exerciseId: pendingEditExerciseId })
    onPendingEditExerciseFocusHandled()
  }, [pendingEditExerciseId, onPendingEditExerciseFocusHandled])

  function scheduleFocusRestore(focusTarget: FocusRestoreTarget) {
    setPendingFocus(focusTarget)
  }

  function registerAddBreakButtonRef(blockId: string) {
    return (element: HTMLButtonElement | null) => {
      if (element) {
        addBreakButtonRefs.current.set(blockId, element)
        return
      }

      addBreakButtonRefs.current.delete(blockId)
    }
  }

  function registerAddExerciseButtonRef(blockId: string) {
    return (element: HTMLButtonElement | null) => {
      if (element) {
        addExerciseButtonRefs.current.set(blockId, element)
        return
      }

      addExerciseButtonRefs.current.delete(blockId)
    }
  }

  function registerEditBreakButtonRef(itemId: string) {
    return (element: HTMLButtonElement | null) => {
      if (element) {
        editBreakButtonRefs.current.set(itemId, element)
        return
      }

      editBreakButtonRefs.current.delete(itemId)
    }
  }

  function registerExerciseHeadingRef(exerciseId: string) {
    return (element: HTMLHeadingElement | null) => {
      if (element) {
        exerciseHeadingRefs.current.set(exerciseId, element)
        return
      }

      exerciseHeadingRefs.current.delete(exerciseId)
    }
  }

  function registerEditExerciseButtonRef(exerciseId: string) {
    return (element: HTMLButtonElement | null) => {
      if (element) {
        editExerciseButtonRefs.current.set(exerciseId, element)
        return
      }

      editExerciseButtonRefs.current.delete(exerciseId)
    }
  }

  function openInlinePanel(panel: Exclude<ActiveInlinePanel, null>) {
    setIsPickerOpen(false)
    if (panel.type === 'addBreak' || panel.type === 'editBreak') {
      setExpandedId(null)
    }
    setActiveInlinePanel(panel)
  }

  function closeInlinePanel(focusTarget?: FocusRestoreTarget) {
    setActiveInlinePanel(null)

    if (focusTarget) {
      scheduleFocusRestore(focusTarget)
    }
  }

  function toggleExpanded(id: string) {
    setExpandedId((current) => (current === id ? null : id))
  }

  function addFirstBlock(blockType: WorkoutBlockType) {
    const block = createWorkoutBlock(blockType)
    dispatch({ type: 'addBlock', block })
    scheduleFocusRestore({ type: 'addExercise', blockId: block.id })
  }

  function openBlockPicker() {
    setActiveInlinePanel(null)
    setIsPickerOpen(true)
  }

  function closeBlockPicker() {
    setIsPickerOpen(false)
    scheduleFocusRestore({ type: 'addBlock' })
  }

  const editingBreakItem = resolvedPanel?.type === 'editBreak'
    ? blocks
      .find((block) => block.id === resolvedPanel.blockId)
      ?.items.find((item) => item.id === resolvedPanel.itemId && item.type === 'break')
    : undefined

  return (
    <section ref={sectionRef} aria-labelledby="workout-builder-timeline-heading" className="flex flex-col gap-[14px]">
      <h2 id="workout-builder-timeline-heading" className="sr-only">{labels.timelineHeading}</h2>

      {blocks.length === 0 ? (
        <BlockTypeTiles heading={labels.firstBlock} featureWarmup onSelect={addFirstBlock} />
      ) : (
        <ol className="wb-blocks" aria-label={labels.blocksList}>
          {blocks.map((block: WorkoutBlock, index: number) => (
            <WorkoutBlockCard
              key={block.id}
              block={block}
              position={index + 1}
              allBlocks={blocks}
              dispatch={dispatch}
              canAddExercise={canAddExercise}
              activeInlinePanel={activeInlinePanel}
              expandedId={expandedId}
              onToggleExpanded={toggleExpanded}
              onOpenInlinePanel={openInlinePanel}
              onCloseInlinePanel={closeInlinePanel}
              onScheduleFocusRestore={scheduleFocusRestore}
              onOpenExerciseLibrary={onOpenExerciseLibrary}
              onOpenExerciseEdit={onOpenExerciseEdit}
              registerAddBreakButtonRef={registerAddBreakButtonRef(block.id)}
              registerAddExerciseButtonRef={registerAddExerciseButtonRef(block.id)}
              registerEditBreakButtonRef={registerEditBreakButtonRef}
              registerExerciseHeadingRef={registerExerciseHeadingRef}
              registerEditExerciseButtonRef={registerEditExerciseButtonRef}
            />
          ))}
        </ol>
      )}

      {blocks.length > 0 ? <AddBlockPicker isOpen={isPickerOpen} onClose={closeBlockPicker} dispatch={dispatch} /> : null}

      {blocks.length > 0 && !isPickerOpen ? (
        <button ref={addBlockButtonRef} type="button" onClick={openBlockPicker} className="wb-add-block">
          <TimelinePlusIcon strokeWidth={2.6} />
          {labels.addNextBlock}
        </button>
      ) : null}

      {resolvedPanel?.type === 'addBreak' ? (
        <WorkoutBreakSheet
          key={`add:${resolvedPanel.blockId}`}
          mode="add"
          onCancel={() => closeInlinePanel({ type: 'addBreak', blockId: resolvedPanel.blockId })}
          onSubmit={(durationSeconds, instruction) => {
            dispatch({
              type: 'addBreak',
              blockId: resolvedPanel.blockId,
              breakItem: createWorkoutBreak(durationSeconds, instruction),
            })
            closeInlinePanel({ type: 'addBreak', blockId: resolvedPanel.blockId })
          }}
        />
      ) : null}

      {resolvedPanel?.type === 'editBreak' && editingBreakItem?.type === 'break' ? (
        <WorkoutBreakSheet
          key={`edit:${resolvedPanel.itemId}`}
          mode="edit"
          initialDurationSeconds={editingBreakItem.durationSeconds}
          initialInstruction={editingBreakItem.instruction}
          onCancel={() => closeInlinePanel({ type: 'editBreak', itemId: resolvedPanel.itemId })}
          onSubmit={(durationSeconds, instruction) => {
            dispatch({
              type: 'updateBreak',
              blockId: resolvedPanel.blockId,
              breakId: resolvedPanel.itemId,
              durationSeconds,
              instruction,
            })
            closeInlinePanel({ type: 'editBreak', itemId: resolvedPanel.itemId })
          }}
        />
      ) : null}
    </section>
  )
}

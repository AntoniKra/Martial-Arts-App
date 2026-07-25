import type { Dispatch } from 'react'
import { useEffect, useRef, useState } from 'react'

import { calculateWorkoutPlanSummary } from '@/domain/workout/workoutCalculations'
import { AddBlockPicker } from '@/features/workout-builder/components/AddBlockPicker'
import { PlusIcon } from '@/features/workout-builder/components/MoveIcons'
import type {
  ActiveInlinePanel,
  FocusRestoreTarget,
} from '@/features/workout-builder/components/workoutBuilderUi.types'
import { WorkoutBlockCard } from '@/features/workout-builder/components/WorkoutBlockCard'
import type {
  WorkoutBuilderAction,
  WorkoutBuilderState,
} from '@/features/workout-builder/state/workoutBuilder.types'
import { formatEstimatedDuration } from '@/features/workout-builder/utils/formatDuration'
import { polishPlural } from '@/features/workout-builder/utils/polishPlural'
import type { WorkoutBlock } from '@/domain/workout/workout.types'

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
  const [pendingFocus, setPendingFocus] = useState<FocusRestoreTarget | null>(null)
  const addBlockButtonRef = useRef<HTMLButtonElement>(null)
  const addBreakButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const addExerciseButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const editBreakButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const exerciseHeadingRefs = useRef(new Map<string, HTMLHeadingElement>())
  const editExerciseButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const { blocks } = state.draft
  const summary = calculateWorkoutPlanSummary(state.draft)
  const canAddExercise = state.draft.disciplineKey !== null

  useEffect(() => {
    setActiveInlinePanel((currentPanel) => resolveActiveInlinePanel(blocks, currentPanel))
  }, [blocks])

  useEffect(() => {
    if (!pendingFocus) {
      return
    }

    const frame = requestAnimationFrame(() => {
      switch (pendingFocus.type) {
        case 'addBlock':
          addBlockButtonRef.current?.focus()
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
    setActiveInlinePanel(panel)
  }

  function closeInlinePanel(focusTarget?: FocusRestoreTarget) {
    setActiveInlinePanel(null)

    if (focusTarget) {
      scheduleFocusRestore(focusTarget)
    }
  }

  function openBlockPicker() {
    setActiveInlinePanel(null)
    setIsPickerOpen(true)
  }

  function closeBlockPicker() {
    setIsPickerOpen(false)
    scheduleFocusRestore({ type: 'addBlock' })
  }

  return (
    <section aria-labelledby="workout-builder-timeline-heading" className="mt-8 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2
          id="workout-builder-timeline-heading"
          className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint"
        >
          Oś treningu
        </h2>
        {summary.exerciseCount > 0 ? (
          <p className="text-[12px] text-muted">
            <span className="tabular-nums">{summary.exerciseCount}</span>{' '}
            {polishPlural(summary.exerciseCount, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}
            {' · '}
            <span className="tabular-nums">{summary.plannedRoundCount}</span>{' '}
            {polishPlural(summary.plannedRoundCount, 'runda', 'rundy', 'rund')}
            {' · '}
            ok. <span className="tabular-nums">{formatEstimatedDuration(summary.estimatedTotalSeconds)}</span>
          </p>
        ) : null}
      </div>

      {blocks.length === 0 ? (
        <p className="border border-bd bg-surface px-4 py-4 text-[13px] leading-relaxed text-muted">
          Dodaj pierwszy blok, aby rozpocząć budowanie treningu.
        </p>
      ) : (
        <ol className="space-y-4" aria-label="Bloki treningu">
          {blocks.map((block: WorkoutBlock, index: number) => (
            <WorkoutBlockCard
              key={block.id}
              block={block}
              position={index + 1}
              allBlocks={blocks}
              dispatch={dispatch}
              canAddExercise={canAddExercise}
              activeInlinePanel={activeInlinePanel}
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

      <AddBlockPicker isOpen={isPickerOpen} onClose={closeBlockPicker} dispatch={dispatch} />

      {!isPickerOpen ? (
        <button
          ref={addBlockButtonRef}
          type="button"
          onClick={openBlockPicker}
          className="flex min-h-touch w-full items-center justify-center gap-2 border border-dashed border-bd px-4 py-3 font-display text-[12px] font-semibold uppercase tracking-[0.06em] text-muted transition-colors hover:border-muted/60 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
        >
          <PlusIcon />
          Dodaj blok
        </button>
      ) : null}
    </section>
  )
}

import type { Dispatch } from 'react'
import { useEffect, useRef, useState } from 'react'

import type { WorkoutBlock } from '@/domain/workout/workout.types'
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

interface WorkoutTimelineProps {
  state: WorkoutBuilderState
  dispatch: Dispatch<WorkoutBuilderAction>
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

export function WorkoutTimeline({ state, dispatch }: WorkoutTimelineProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [activeInlinePanel, setActiveInlinePanel] = useState<ActiveInlinePanel>(null)
  const [pendingFocus, setPendingFocus] = useState<FocusRestoreTarget | null>(null)
  const addBlockButtonRef = useRef<HTMLButtonElement>(null)
  const addBreakButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const editBreakButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const { blocks } = state.draft

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
        case 'editBreak':
          editBreakButtonRefs.current.get(pendingFocus.itemId)?.focus()
          break
      }

      setPendingFocus(null)
    })

    return () => cancelAnimationFrame(frame)
  }, [pendingFocus])

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

  function registerEditBreakButtonRef(itemId: string) {
    return (element: HTMLButtonElement | null) => {
      if (element) {
        editBreakButtonRefs.current.set(itemId, element)
        return
      }

      editBreakButtonRefs.current.delete(itemId)
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
      <h2
        id="workout-builder-timeline-heading"
        className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint"
      >
        Oś treningu
      </h2>

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
              activeInlinePanel={activeInlinePanel}
              onOpenInlinePanel={openInlinePanel}
              onCloseInlinePanel={closeInlinePanel}
              onScheduleFocusRestore={scheduleFocusRestore}
              registerAddBreakButtonRef={registerAddBreakButtonRef(block.id)}
              registerEditBreakButtonRef={registerEditBreakButtonRef}
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

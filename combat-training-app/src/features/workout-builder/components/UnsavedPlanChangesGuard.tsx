import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useBlocker } from 'react-router-dom'

import { getButtonClassName } from '@/components/ui/buttonStyles'
import {
  blocksUnsavedPlanLeave,
  hasUnsavedPlanChanges,
} from '@/features/workout-builder/unsavedPlanChanges'
import { workoutBuilderLabels as labels } from '@/features/workout-builder/workoutBuilderLabels'

interface UnsavedPlanChangesGuardProps {
  isDirty: boolean
  allowLeaveRef: RefObject<boolean>
  children: ReactNode
  description?: string
}

export function UnsavedPlanChangesGuard({ isDirty, allowLeaveRef, children, description = labels.discardDescription }: UnsavedPlanChangesGuardProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const returnButtonRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const handledBlockerRef = useRef<ReturnType<typeof useBlocker> | null>(null)
  const [open, setOpen] = useState(false)
  const blocker = useBlocker(
    ({ nextLocation }) => blocksUnsavedPlanLeave(isDirty, allowLeaveRef.current, nextLocation.pathname),
  )

  useEffect(() => {
    if (!hasUnsavedPlanChanges(isDirty, allowLeaveRef.current)) {
      return
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedPlanChanges(isDirty, allowLeaveRef.current)) {
        return
      }

      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [allowLeaveRef, isDirty])

  useEffect(() => {
    // Handle each blocked navigation once so a reset cannot reopen the dialog.
    if (blocker.state === 'blocked' && handledBlockerRef.current !== blocker) {
      handledBlockerRef.current = blocker
      triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setOpen(true)
    }
  }, [blocker])

  useEffect(() => {
    if (!open) {
      return
    }

    const dialog = dialogRef.current
    if (dialog && !dialog.open) {
      dialog.showModal()
    }
    returnButtonRef.current?.focus()
  }, [open])

  function stay() {
    dialogRef.current?.close()
    setOpen(false)
    if (blocker.state === 'blocked') {
      blocker.reset()
    }
    triggerRef.current?.focus()
  }

  function discard() {
    if (blocker.state !== 'blocked') {
      return
    }

    blocker.proceed()
  }

  return (
    <>
      {children}
      {open ? (
        <dialog
          ref={dialogRef}
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          onCancel={(event) => {
            event.preventDefault()
            stay()
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Tab') {
              return
            }

            const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
            const first = buttons[0]
            const last = buttons[buttons.length - 1]
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault()
              last?.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault()
              first?.focus()
            }
          }}
          className="fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-sm overflow-y-auto border border-bd bg-surface p-5 text-ink backdrop:bg-bg/80"
        >
          <h2 id={titleId} className="font-display text-xl font-bold">{labels.discardTitle}</h2>
          <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              className={getButtonClassName({ variant: 'danger', size: 'lg' })}
              onClick={discard}
            >
              {labels.discardChanges}
            </button>
            <button
              ref={returnButtonRef}
              type="button"
              autoFocus
              className={getButtonClassName({ variant: 'secondary', size: 'lg' })}
              onClick={stay}
            >
              {labels.returnToEditing}
            </button>
          </div>
        </dialog>
      ) : null}
    </>
  )
}

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'

import { getButtonClassName } from '@/components/ui/buttonStyles'
import type { WorkoutPlaybackStatus } from '@/domain/workout-playback/workoutPlayback.types'
import { workoutPlayerLabels as labels } from '@/features/workout-player/workoutPlayerLabels'

interface WorkoutPlayerExitControlsProps {
  status: WorkoutPlaybackStatus
  canFinishExercise: boolean
  workoutDetailsPath: string
  onPause: () => void
  onResume: () => void
  onFinishExercise: () => void
  onEndEarly: () => void
  onDiscard: () => void
}

export function WorkoutPlayerExitControls({
  status, canFinishExercise, workoutDetailsPath, onPause, onResume, onFinishExercise, onEndEarly, onDiscard,
}: WorkoutPlayerExitControlsProps) {
  const navigate = useNavigate()
  const menuId = useId()
  const titleId = useId()
  const descriptionId = useId()
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const returnButtonRef = useRef<HTMLButtonElement>(null)
  const resumeOnReturnRef = useRef(false)
  const allowExitRef = useRef(false)
  const dialogOpenRef = useRef(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const active = status === 'running' || status === 'paused'
  const blocker = useBlocker(() => {
    // Clear preparation before navigation commits, including a browser back followed by reload.
    if (status === 'preparing') onDiscard()
    return active && !allowExitRef.current
  })
  const handledBlockerRef = useRef<typeof blocker | null>(null)

  const openExit = useCallback(() => {
    if (dialogOpenRef.current) return
    dialogOpenRef.current = true
    resumeOnReturnRef.current = status === 'running'
    onPause()
    setMenuOpen(false)
    setExitOpen(true)
  }, [onPause, status])

  useEffect(() => {
    // A return may resume playback before the router publishes its reset state.
    // Handle each blocked navigation once so that render cannot reopen the dialog.
    if (blocker.state === 'blocked' && handledBlockerRef.current !== blocker) {
      handledBlockerRef.current = blocker
      openExit()
    }
  }, [blocker, openExit])

  useEffect(() => {
    if (exitOpen) {
      dialogRef.current?.showModal()
      returnButtonRef.current?.focus()
    }
  }, [exitOpen])

  useEffect(() => {
    if (!menuOpen) return
    const menu = menuRef.current
    menu?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !menu?.contains(event.target) && !menuButtonRef.current?.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [menuOpen])

  function closeExit() {
    dialogRef.current?.close()
    dialogOpenRef.current = false
    setExitOpen(false)
    if (blocker.state === 'blocked') blocker.reset()
    menuButtonRef.current?.focus()
  }

  function returnToWorkout() {
    closeExit()
    if (resumeOnReturnRef.current) onResume()
  }

  return (
    <>
      <div className="relative shrink-0">
        <button
          ref={menuButtonRef}
          type="button"
          aria-label={labels.menu}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? menuId : undefined}
          disabled={!active}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex min-h-touch min-w-touch items-center justify-center border border-bd bg-surface text-ink disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
          </svg>
        </button>
        {menuOpen ? (
          <div
            id={menuId}
            ref={menuRef}
            role="menu"
            aria-label={labels.menu}
            className="absolute right-0 top-full z-10 mt-2 w-60 border border-bd bg-elevated p-1"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== menuButtonRef.current) setMenuOpen(false)
            }}
            onKeyDown={(event) => {
              const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
              const index = buttons.findIndex((button) => button === document.activeElement)
              if (event.key === 'Escape') {
                event.preventDefault()
                setMenuOpen(false)
                menuButtonRef.current?.focus()
              } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault()
                const target = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
                  : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
                buttons[target]?.focus()
              }
            }}
          >
            <button
              type="button" role="menuitem" disabled={!canFinishExercise}
              className={getButtonClassName({ variant: 'ghost', disabled: !canFinishExercise, className: 'w-full justify-start' })}
              onClick={() => {
                setMenuOpen(false)
                menuButtonRef.current?.focus()
                onFinishExercise()
              }}
            >{labels.finishExercise}</button>
            <button type="button" role="menuitem" onClick={openExit}
              className={getButtonClassName({ variant: 'ghost', className: 'w-full justify-start' })}
            >{labels.finishWorkout}</button>
          </div>
        ) : null}
      </div>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => { event.preventDefault(); returnToWorkout() }}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return
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
        <h2 id={titleId} className="font-display text-xl font-bold">{labels.exitTitle}</h2>
        <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-muted">{labels.exitDescription}</p>
        <div className="mt-6 flex flex-col gap-3">
          <button type="button" className={getButtonClassName({ variant: 'primary', size: 'lg' })}
            onClick={() => { closeExit(); onEndEarly() }}
          >{labels.endEarly}</button>
          <button type="button"
            className={getButtonClassName({ variant: 'danger', size: 'lg', className: 'flex-col gap-1 whitespace-normal border-2 py-3' })}
            onClick={() => {
              onDiscard()
              if (blocker.state === 'blocked') {
                blocker.proceed()
                return
              }
              allowExitRef.current = true
              closeExit()
              void navigate(workoutDetailsPath)
            }}
          >
            <span className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
              </svg>
              {labels.discard}
            </span>
            <span className="text-xs font-normal normal-case leading-relaxed">{labels.discardWarning}</span>
          </button>
          <button ref={returnButtonRef} type="button" onClick={returnToWorkout}
            className={getButtonClassName({ variant: 'secondary', size: 'lg' })}
          >{labels.return}</button>
        </div>
      </dialog>
    </>
  )
}

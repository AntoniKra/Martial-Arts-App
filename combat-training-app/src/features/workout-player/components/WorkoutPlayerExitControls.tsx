import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'

import { getButtonClassName } from '@/components/ui/buttonStyles'
import type { WorkoutPlaybackStatus } from '@/domain/workout-playback/workoutPlayback.types'
import { workoutPlayerLabels as labels } from '@/features/workout-player/workoutPlayerLabels'

interface WorkoutPlayerExitControlsProps {
  status: WorkoutPlaybackStatus
  canFinishExercise: boolean
  remainingRounds: number
  workoutDetailsPath: string
  onPause: () => void
  onResume: () => void
  onFinishExercise: () => void
  onEndEarly: () => void
  onDiscard: () => void
}

export function WorkoutPlayerExitControls({
  status, canFinishExercise, remainingRounds, workoutDetailsPath, onPause, onResume, onFinishExercise, onEndEarly, onDiscard,
}: WorkoutPlayerExitControlsProps) {
  const navigate = useNavigate()
  const titleId = useId()
  const descriptionId = useId()
  const exitButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const returnButtonRef = useRef<HTMLButtonElement>(null)
  const resumeOnReturnRef = useRef(false)
  const allowExitRef = useRef(false)
  const dialogOpenRef = useRef(false)
  const [exitOpen, setExitOpen] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
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
      if (!dialogRef.current?.open) dialogRef.current?.showModal()
      returnButtonRef.current?.focus()
    }
  }, [exitOpen, confirmDiscard])

  function closeExit() {
    dialogRef.current?.close()
    dialogOpenRef.current = false
    setExitOpen(false)
    setConfirmDiscard(false)
    if (blocker.state === 'blocked') blocker.reset()
    exitButtonRef.current?.focus()
  }

  function returnToWorkout() {
    closeExit()
    if (resumeOnReturnRef.current) onResume()
  }

  function discardWorkout() {
    onDiscard()
    allowExitRef.current = true
    dialogRef.current?.close()
    if (blocker.state === 'blocked') {
      blocker.proceed()
    } else {
      closeExit()
      void navigate(workoutDetailsPath)
    }
  }

  return (
    <>
      <button
        ref={exitButtonRef}
        type="button"
        aria-label={labels.finishWorkout}
        aria-haspopup="dialog"
        disabled={!active}
        onClick={openExit}
        className="flex min-h-touch min-w-touch shrink-0 items-center justify-center border border-bd bg-surface text-ink disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          event.preventDefault()
          if (confirmDiscard) setConfirmDiscard(false)
          else returnToWorkout()
        }}
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
        className="fixed inset-x-0 bottom-0 top-auto m-0 mx-auto max-h-[100dvh] w-full max-w-lg overflow-y-auto border-t border-bd bg-surface px-4 pt-5 pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))] text-ink backdrop:bg-bg/80"
      >
        <h2 id={titleId} className="font-display text-2xl font-extrabold">{confirmDiscard ? labels.discardTitle : labels.exitTitle}</h2>
        <p id={descriptionId} className="mt-2.5 text-[13px] leading-relaxed text-muted">{confirmDiscard ? labels.discardDescription : labels.exitDescription}</p>
        {confirmDiscard ? (
          <div className="mt-2.5 flex flex-col gap-2.5">
            <button type="button" onClick={discardWorkout}
              className={getButtonClassName({ variant: 'primary', className: 'min-h-[52px]' })}
            >{labels.discard}</button>
            <button ref={returnButtonRef} type="button" onClick={() => setConfirmDiscard(false)}
              className={getButtonClassName({ variant: 'secondary', className: 'min-h-[52px]' })}
            >{labels.return}</button>
          </div>
        ) : (
          <div className="mt-2.5 flex flex-col gap-2.5">
            <button ref={returnButtonRef} type="button" onClick={returnToWorkout}
              className="min-h-[52px] rounded-[2px] border border-ink px-3 text-sm font-semibold"
            >{labels.returnToWorkout}</button>
            {canFinishExercise ? <button type="button"
              className="min-h-touch rounded-[2px] border border-bd px-3 text-sm font-semibold"
              onClick={() => {
                closeExit()
                if (resumeOnReturnRef.current) onResume()
                onFinishExercise()
              }}
            >{labels.skipExercise(remainingRounds)}</button> : null}
            <div aria-hidden="true" className="h-5" />
            <button type="button" className="min-h-[52px] rounded-[2px] bg-crimson px-3 font-display text-sm font-extrabold uppercase tracking-[0.06em] text-on-accent hover:bg-crimson-hi"
              onClick={() => { closeExit(); onEndEarly() }}
            >{labels.endEarly}</button>
            <button type="button" className="min-h-touch px-3 text-sm font-semibold text-crimson-ink underline"
              onClick={() => setConfirmDiscard(true)}
            >{labels.discardWithoutSaving}</button>
            <p className="text-center text-xs leading-relaxed text-faint">{labels.discardHint}</p>
          </div>
        )}
      </dialog>
    </>
  )
}

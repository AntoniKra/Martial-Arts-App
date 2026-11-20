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
        onClick={() => { if (active) openExit(); else void navigate(workoutDetailsPath) }}
        className="player-icon-button topbar-exit-btn"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5m7-7-7 7 7 7" />
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
        className="player-exit-sheet fixed inset-x-0 bottom-0 top-auto m-0 mx-auto max-h-[100dvh] w-full max-w-lg overflow-y-auto"
      >
        <h2 id={titleId} className="font-display text-[18px] font-extrabold">{confirmDiscard ? labels.discardTitle : labels.exitTitle}</h2>
        <p id={descriptionId} className="player-exit-description">{confirmDiscard ? labels.discardDescription : labels.exitDescription}</p>
        {confirmDiscard ? (
          <div className="flex flex-col gap-2">
            <button type="button" onClick={discardWorkout}
              className={getButtonClassName({ variant: 'primary', className: 'min-h-[52px]' })}
            >{labels.discard}</button>
            <button ref={returnButtonRef} type="button" onClick={() => setConfirmDiscard(false)}
              className={getButtonClassName({ variant: 'secondary', className: 'min-h-[52px]' })}
            >{labels.return}</button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button ref={returnButtonRef} type="button" onClick={returnToWorkout}
              className="player-exit-return"
            >{labels.returnToWorkout}</button>
            {canFinishExercise ? <button type="button"
              className="player-exit-secondary player-exit-skip"
              onClick={() => {
                closeExit()
                if (resumeOnReturnRef.current) onResume()
                onFinishExercise()
              }}
            >{labels.skipExercise(remainingRounds)}</button> : null}
            <button type="button" className="player-exit-secondary mt-3"
              onClick={() => { closeExit(); onEndEarly() }}
            >{labels.endEarly}</button>
            <button type="button" className="player-exit-discard min-h-touch px-3 text-[12.5px] font-semibold"
              onClick={() => setConfirmDiscard(true)}
            >{labels.discardWithoutSaving}</button>
          </div>
        )}
      </dialog>
    </>
  )
}

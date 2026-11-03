import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button, getButtonClassName } from '@/components/ui/Button'
import { workoutPlanLabels } from '@/features/workouts/workoutPlanLabels'

interface WorkoutPlanActionsProps {
  editPath: string
  onDelete: () => Promise<void>
}

export function WorkoutPlanActions({ editPath, onDelete }: WorkoutPlanActionsProps) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(false)
  const inFlightRef = useRef(false)
  const deleteButtonRef = useRef<HTMLButtonElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)

  async function handleDelete() {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setDeleting(true)
    setError(false)

    try {
      await onDelete()
    } catch {
      setError(true)
      requestAnimationFrame(() => errorRef.current?.focus())
    } finally {
      inFlightRef.current = false
      setDeleting(false)
    }
  }

  return (
    <div className="w-full space-y-3">
      <Link
        to={editPath}
        aria-disabled={deleting || undefined}
        onClick={(event) => { if (inFlightRef.current) event.preventDefault() }}
        className={getButtonClassName({ variant: 'secondary', className: 'w-full' })}
      >
        {workoutPlanLabels.edit}
      </Link>
      {confirming ? (
        <div className="border border-bd bg-bg/40 px-3 py-3" aria-busy={deleting}>
          <p className="text-[13px] leading-relaxed text-muted">{workoutPlanLabels.deleteWarning}</p>
          {error ? (
            <p ref={errorRef} role="alert" tabIndex={-1} className="mt-3 text-[13px] text-ink">
              {workoutPlanLabels.deleteFailed}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              ref={cancelButtonRef}
              type="button"
              className={getButtonClassName({ variant: 'ghost', size: 'sm', disabled: deleting })}
              disabled={deleting}
              onClick={() => {
                setConfirming(false)
                setError(false)
                requestAnimationFrame(() => deleteButtonRef.current?.focus())
              }}
            >
              {workoutPlanLabels.cancel}
            </button>
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              aria-label={workoutPlanLabels.confirmDelete}
              onClick={() => { void handleDelete() }}
            >
              {deleting ? workoutPlanLabels.deleting : workoutPlanLabels.delete}
            </Button>
          </div>
        </div>
      ) : (
        <button
          ref={deleteButtonRef}
          type="button"
          className={getButtonClassName({ variant: 'danger', className: 'w-full' })}
          onClick={() => {
            setConfirming(true)
            requestAnimationFrame(() => cancelButtonRef.current?.focus())
          }}
        >
          {workoutPlanLabels.delete}
        </button>
      )}
    </div>
  )
}

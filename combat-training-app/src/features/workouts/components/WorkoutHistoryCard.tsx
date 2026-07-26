import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { routes } from '@/app/routes'
import { Button, getButtonClassName } from '@/components/ui/Button'
import { DisciplineBadge } from '@/components/domain/DisciplineBadge'
import { WorkoutHistoryNoteEditor } from '@/features/workouts/components/WorkoutHistoryNoteEditor'
import type {
  WorkoutHistoryListItem,
  WorkoutHistoryMutationResult,
} from '@/features/workouts/types/workoutsView.types'
import { WORKOUT_HISTORY_NOTE_MAX_LENGTH } from '@/features/workouts/types/workoutsView.types'

const NOTE_SAVE_ERROR_MESSAGE = 'Nie udało się zapisać notatki.'
const DELETE_ERROR_MESSAGE = 'Nie udało się usunąć wpisu.'

interface WorkoutHistoryCardProps {
  session: WorkoutHistoryListItem
  onUpdateNote: (sessionId: string, note: string) => Promise<WorkoutHistoryMutationResult>
  onDelete: (sessionId: string) => Promise<WorkoutHistoryMutationResult>
}

export function WorkoutHistoryCard({ session, onUpdateNote, onDelete }: WorkoutHistoryCardProps) {
  const noteToggleButtonRef = useRef<HTMLButtonElement>(null)
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null)
  const deleteTriggerButtonRef = useRef<HTMLButtonElement>(null)
  const deleteCancelButtonRef = useRef<HTMLButtonElement>(null)
  const shouldFocusNoteTextareaRef = useRef(false)
  const shouldRestoreEditTriggerFocusRef = useRef(false)
  const shouldFocusDeleteCancelRef = useRef(false)
  const shouldRestoreDeleteTriggerFocusRef = useRef(false)
  const isMountedRef = useRef(true)
  const noteOperationTokenRef = useRef(0)
  const deleteOperationTokenRef = useRef(0)
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [draftNote, setDraftNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [noteSaveError, setNoteSaveError] = useState<string | null>(null)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const deleteConfirmationId = useId()

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!isEditingNote) {
      setDraftNote(session.note ?? '')
      setNoteSaveError(null)
    }
  }, [isEditingNote, session.note])

  useEffect(() => {
    if (isEditingNote && shouldFocusNoteTextareaRef.current) {
      shouldFocusNoteTextareaRef.current = false
      noteTextareaRef.current?.focus()
    }
  }, [isEditingNote])

  useEffect(() => {
    if (!isEditingNote && shouldRestoreEditTriggerFocusRef.current) {
      shouldRestoreEditTriggerFocusRef.current = false
      noteToggleButtonRef.current?.focus()
    }
  }, [isEditingNote])

  useEffect(() => {
    if (isConfirmingDelete && shouldFocusDeleteCancelRef.current) {
      shouldFocusDeleteCancelRef.current = false
      deleteCancelButtonRef.current?.focus()
    }
  }, [isConfirmingDelete])

  useEffect(() => {
    if (!isConfirmingDelete && shouldRestoreDeleteTriggerFocusRef.current) {
      shouldRestoreDeleteTriggerFocusRef.current = false
      deleteTriggerButtonRef.current?.focus()
    }
  }, [isConfirmingDelete])

  const isOperationInProgress = isSavingNote || isDeleting
  const hasSavedNote = session.note !== null

  function openNoteEditor(): void {
    setDraftNote(session.note ?? '')
    setNoteSaveError(null)
    shouldFocusNoteTextareaRef.current = true
    setIsEditingNote(true)
  }

  function closeNoteEditor(): void {
    shouldRestoreEditTriggerFocusRef.current = true
    setIsEditingNote(false)
    setDraftNote(session.note ?? '')
    setNoteSaveError(null)
  }

  async function handleSaveNote(): Promise<void> {
    if (isSavingNote || draftNote.length > WORKOUT_HISTORY_NOTE_MAX_LENGTH) {
      return
    }

    const operationToken = noteOperationTokenRef.current + 1
    noteOperationTokenRef.current = operationToken

    setIsSavingNote(true)
    setNoteSaveError(null)

    try {
      const result = await onUpdateNote(session.id, draftNote)

      if (!isMountedRef.current || operationToken !== noteOperationTokenRef.current) {
        return
      }

      if (result === 'applied') {
        setIsEditingNote(false)
      }
    } catch {
      if (!isMountedRef.current || operationToken !== noteOperationTokenRef.current) {
        return
      }

      setNoteSaveError(NOTE_SAVE_ERROR_MESSAGE)
    } finally {
      if (isMountedRef.current && operationToken === noteOperationTokenRef.current) {
        setIsSavingNote(false)
      }
    }
  }

  function handleCancelDelete(): void {
    if (isDeleting) {
      return
    }

    shouldRestoreDeleteTriggerFocusRef.current = true
    setIsConfirmingDelete(false)
    setDeleteError(null)
  }

  async function handleConfirmDelete(): Promise<void> {
    if (isDeleting) {
      return
    }

    const operationToken = deleteOperationTokenRef.current + 1
    deleteOperationTokenRef.current = operationToken

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const result = await onDelete(session.id)

      if (!isMountedRef.current || operationToken !== deleteOperationTokenRef.current) {
        return
      }

      if (result === 'stale') {
        setIsDeleting(false)
      }
    } catch {
      if (!isMountedRef.current || operationToken !== deleteOperationTokenRef.current) {
        return
      }

      setDeleteError(DELETE_ERROR_MESSAGE)
      setIsDeleting(false)
    }
  }

  return (
    <article className="@container w-full overflow-hidden border border-bd bg-surface">
      <div className="px-4 py-4">
        <div className="mb-1 flex items-start justify-between gap-3">
          <DisciplineBadge disciplineKey={session.disciplineKey} />
          <div className="shrink-0 text-right text-[10px] text-muted">
            <time className="block" dateTime={session.completedAt}>
              {session.dateLabelPl}
            </time>
            <time className="block tabular-nums" dateTime={session.completedAt}>
              {session.timeLabelPl}
            </time>
          </div>
        </div>
        <h3 className="mt-1 font-display text-[14px] font-semibold text-ink">
          <Link
            to={routes.workoutReport(session.id)}
            className="transition-colors hover:text-crimson focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
          >
            {session.name}
          </Link>
        </h3>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-display text-[11px] text-muted @min-[400px]:grid-cols-3 @min-[560px]:items-baseline @min-[560px]:gap-x-2">
          <span className="whitespace-nowrap">
            <span className="font-semibold tabular-nums text-ink">{session.durationLabelPl}</span>
          </span>
          <span className="whitespace-nowrap">
            <span className="font-semibold tabular-nums text-ink">
              {session.completedExercises}/{session.plannedExercises}
            </span>{' '}
            ćwiczeń
          </span>
          {session.plannedRounds !== null ? (
            <span className="whitespace-nowrap">
              <span className="font-semibold tabular-nums text-ink">
                {session.completedRounds}/{session.plannedRounds}
              </span>{' '}
              rund
            </span>
          ) : null}
        </div>
      </div>

      <div className="h-0.5 bg-elevated" aria-hidden="true">
        <div
          className="h-full bg-crimson transition-all"
          style={{ width: `${session.exerciseCompletionPercent}%` }}
        />
      </div>

      <div className="border-t border-bd px-4 py-3">
        {hasSavedNote && !isEditingNote ? (
          <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-ink">{session.note}</p>
        ) : null}

        {isEditingNote ? (
          <WorkoutHistoryNoteEditor
            value={draftNote}
            onChange={setDraftNote}
            onSave={() => {
              void handleSaveNote()
            }}
            onCancel={closeNoteEditor}
            isSaving={isSavingNote}
            saveError={noteSaveError}
            textareaRef={noteTextareaRef}
          />
        ) : (
          <button
            ref={noteToggleButtonRef}
            type="button"
            disabled={isOperationInProgress || isConfirmingDelete}
            onClick={openNoteEditor}
            className="font-display text-[11px] font-semibold uppercase tracking-[0.06em] text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
          >
            {hasSavedNote ? 'Edytuj notatkę' : 'Dodaj notatkę'}
          </button>
        )}
      </div>

      <div className="border-t border-bd px-4 py-3">
        {isConfirmingDelete ? (
          <div aria-labelledby={deleteConfirmationId} className="space-y-3">
            <p id={deleteConfirmationId} className="text-[13px] leading-relaxed text-muted">
              Czy na pewno chcesz usunąć ten wpis? Tej operacji nie można cofnąć.
            </p>

            {deleteError ? (
              <p className="text-[13px] leading-relaxed text-crimson" role="alert">
                {deleteError}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                ref={deleteCancelButtonRef}
                type="button"
                disabled={isDeleting}
                onClick={handleCancelDelete}
                className={getButtonClassName({ variant: 'ghost', size: 'sm', disabled: isDeleting })}
              >
                Anuluj
              </button>
              <Button
                type="button"
                size="sm"
                variant="danger"
                loading={isDeleting}
                disabled={isDeleting}
                onClick={() => {
                  void handleConfirmDelete()
                }}
              >
                Usuń
              </Button>
            </div>
          </div>
        ) : (
          <button
            ref={deleteTriggerButtonRef}
            type="button"
            disabled={isOperationInProgress || isEditingNote}
            onClick={() => {
              setDeleteError(null)
              shouldFocusDeleteCancelRef.current = true
              setIsConfirmingDelete(true)
            }}
            className="font-display text-[11px] font-semibold uppercase tracking-[0.06em] text-crimson underline decoration-crimson/40 underline-offset-2 transition-colors hover:text-crimson-hi hover:decoration-crimson disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
          >
            Usuń wpis
          </button>
        )}
      </div>
    </article>
  )
}

import { actionLabels } from '@/components/ui/actionLabels'
import { CollapsibleCard } from '@/components/ui/CollapsibleCard'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { routes } from '@/app/routes'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { Button } from '@/components/ui/Button'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { DisciplineBadge } from '@/components/domain/DisciplineBadge'
import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import { formatPolishCount } from '@/domain/language/polishPlural'
import { WORKOUT_BLOCK_LABELS_PL } from '@/domain/workout/workoutBlockLabels'
import { WorkoutHistoryNoteEditor } from '@/features/workouts/components/WorkoutHistoryNoteEditor'
import type {
  WorkoutHistoryListItem,
  WorkoutHistoryMutationResult,
} from '@/features/workouts/types/workoutsView.types'
import { WORKOUT_HISTORY_NOTE_MAX_LENGTH } from '@/features/workouts/types/workoutsView.types'
import { workoutPlayerLabels } from '@/features/workout-player/workoutPlayerLabels'
import { workoutFeedbackLabels } from '@/features/workout-feedback/workoutFeedbackLabels'
import { RpeRecallBadge } from '@/features/workout-feedback/RpeRecallBadge'
import { rpeLabels } from '@/features/workout-feedback/rpeLabels'
import { manualWorkoutLabels } from '@/features/manual-workout/manualWorkoutLabels'
import { LazyWellbeingWorkoutLine } from '@/features/wellbeing/LazyWellbeingWorkoutLine'
import { workoutHistoryLabels } from '@/features/workouts/workoutHistoryLabels'
import { historyLabels } from '../historyLabels'
import { calendarDate, historyDayLabel } from '../utils/historyPresentation'
import { historyDate } from '../utils/historyWeeks'
import { HistoryIcon } from './HistoryIcon'

const NOTE_SAVE_ERROR_MESSAGE = 'Nie udało się zapisać notatki.'
const DELETE_ERROR_MESSAGE = 'Nie udało się usunąć wpisu.'

const disciplineBars: Record<DisciplineKey, string> = {
  boxing: 'bg-discipline-boxing',
  kickboxing: 'bg-discipline-kickboxing',
  muay_thai: 'bg-discipline-muay-thai',
  k1: 'bg-discipline-k1',
  mma_striking: 'bg-discipline-mma-striking',
}

const monthFormat = new Intl.DateTimeFormat('pl-PL', { month: 'short', timeZone: 'UTC' })

function HistoryMetric({ label, children }: { label: string; children: ReactNode }) {
  return <div className="history-metric"><dt>{label}</dt><dd>{children}</dd></div>
}

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
  const hasSavedNote = Boolean(session.note?.trim())
  const date = historyDate(session)
  const day = calendarDate(date)
  const sparring = session.sparringRounds == null ? null : formatPolishCount(session.sparringRounds, 'runda', 'rundy', 'rund')
  const hasCompletion = !session.isManual && (session.plannedExercises > 0 || session.plannedRounds !== null)

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
    <article className="history-entry">
      <CollapsibleCard className="history-disclosure" title={<span className="flex items-center gap-2">
        <span aria-hidden="true" className={`history-discipline-bar ${disciplineBars[session.disciplineKey]}`} />
        <time dateTime={date} className="history-entry-date">
          <strong>{historyLabels.weekdays[(day.getUTCDay() + 6) % 7]} {day.getUTCDate()}</strong>
          {monthFormat.format(day)}
        </time>
        <span className="min-w-0 flex-1">
          <span className="history-entry-title" role="heading" aria-level={4}>{session.name}</span>
          <span className="history-entry-chips">
            <span>{session.durationLabelPl}</span>
            {session.rpe != null && <span>{workoutHistoryLabels.shortRpe(session.rpe)}</span>}
            {sparring && <span>{sparring}</span>}
            {hasSavedNote && <span className="history-note-chip"><HistoryIcon name="note" size={10} />{workoutHistoryLabels.note}</span>}
          </span>
          {session.hasPendingWrites && <span className="mt-1 block text-xs text-muted">{workoutDataLabels.pending}</span>}
        </span>
        <span className="sr-only">{workoutHistoryLabels.details}</span>
      </span>}>
        <div className="history-entry-meta">
          <DisciplineBadge disciplineKey={session.disciplineKey} className="history-discipline-badge" />
          <p className="history-full-date">
            <time dateTime={date}>{historyDayLabel(date)}</time>
            {!session.isManual && session.timeLabelPl && <> · <span>{workoutHistoryLabels.completedAt} <time dateTime={session.completedAt}>{session.timeLabelPl}</time></span></>}
          </p>
        </div>
        <dl className="history-metrics" aria-label={workoutHistoryLabels.metrics}>
          <HistoryMetric label={workoutHistoryLabels.duration}>{session.durationLabelPl}</HistoryMetric>
          {session.rpe != null && <HistoryMetric label={workoutHistoryLabels.rpe}>
            {session.rpe} / 10 · {rpeLabels.descriptions[session.rpe] || rpeLabels.between[session.rpe]}
            {session.rpeFromMemory && <RpeRecallBadge />}
          </HistoryMetric>}
          {hasCompletion && <HistoryMetric label={session.roundsOnly ? workoutHistoryLabels.roundCompletion : workoutHistoryLabels.exercises}>
            {session.roundsOnly && session.plannedRounds !== null
              ? <span className="block"><span className="whitespace-nowrap">{session.completedRounds}/{session.plannedRounds} rund</span> ({session.exerciseCompletionPercent}%)</span>
              : session.roundsOnly ? <span className="block">{session.exerciseCompletionPercent}%</span> : <>
                <span className="block"><span className="whitespace-nowrap">{session.completedExercises}/{session.plannedExercises} ćwiczeń</span> ({session.exerciseCompletionPercent}%)</span>
                {session.plannedRounds !== null && <span className="block text-[12px] font-semibold text-muted">{session.completedRounds}/{session.plannedRounds} rund</span>}
              </>}
          </HistoryMetric>}
          {sparring && <HistoryMetric label={WORKOUT_BLOCK_LABELS_PL.sparring}>{sparring}</HistoryMetric>}
        </dl>
        {session.workoutDate && <LazyWellbeingWorkoutLine date={session.workoutDate} />}
        {hasSavedNote && !isEditingNote && <div className="history-note">
          <p className="flex items-center gap-1 text-[10.5px] font-bold tracking-wide text-ember-ink uppercase">
            <HistoryIcon name="note" size={12} />{workoutHistoryLabels.athleteNote}
          </p>
          <p className="mt-1 text-[12.5px] leading-[1.45] break-words whitespace-pre-wrap">{session.note}</p>
        </div>}
        {isEditingNote && (
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
        )}
        <div className="history-entry-actions">
          {!isEditingNote && (
            <button
              ref={noteToggleButtonRef}
              type="button"
              disabled={isOperationInProgress || isConfirmingDelete}
              onClick={openNoteEditor}
              className="history-note-button"
            >
              <HistoryIcon name="note" size={13} />{hasSavedNote ? 'Edytuj notatkę' : 'Dodaj notatkę'}
            </button>
          )}
          {!isConfirmingDelete && (
            <button
              ref={deleteTriggerButtonRef}
              type="button"
              disabled={isOperationInProgress || isEditingNote}
              onClick={() => {
                setDeleteError(null)
                shouldFocusDeleteCancelRef.current = true
                setIsConfirmingDelete(true)
              }}
              className="history-delete-button"
            >
              Usuń wpis
            </button>
          )}
        </div>
        {isConfirmingDelete && (
          <div aria-labelledby={deleteConfirmationId} className="space-y-3 rounded-sm border border-bd p-3">
            <p id={deleteConfirmationId} className="text-[13px] leading-relaxed text-muted">
              Czy na pewno chcesz usunąć ten wpis? Tej operacji nie można cofnąć.
            </p>

            {deleteError ? (
              <p className="text-[13px] leading-relaxed text-crimson-ink" role="alert">
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
                {actionLabels.cancel}
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
        )}
        <div className="history-entry-links">
          <p className="text-xs font-semibold text-muted">{workoutPlayerLabels.sessionStatus[session.status]}</p>
          {session.editPath && <Link to={session.editPath} state={{ returnTo: routes.progressHistory }}>{manualWorkoutLabels.edit}</Link>}
          {session.feedbackPath && <Link to={session.feedbackPath}>{workoutFeedbackLabels.title}</Link>}
          {!session.isManual && <Link to={routes.workoutReport(session.id)}>{workoutHistoryLabels.report}</Link>}
        </div>
      </CollapsibleCard>
    </article>
  )
}

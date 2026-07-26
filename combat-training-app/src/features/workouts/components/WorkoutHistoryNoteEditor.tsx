import { useId, type RefObject } from 'react'

import { Button } from '@/components/ui/Button'
import { WORKOUT_HISTORY_NOTE_MAX_LENGTH } from '@/features/workouts/types/workoutsView.types'

const textareaClassName =
  'min-h-[96px] w-full resize-y border border-bd bg-elevated px-3 py-2 font-display text-[13px] leading-relaxed text-ink placeholder:text-faint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60'

const labelClassName =
  'mb-1.5 block font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint'

interface WorkoutHistoryNoteEditorProps {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
  saveError: string | null
  textareaRef?: RefObject<HTMLTextAreaElement | null>
}

export function WorkoutHistoryNoteEditor({
  value,
  onChange,
  onSave,
  onCancel,
  isSaving,
  saveError,
  textareaRef,
}: WorkoutHistoryNoteEditorProps) {
  const noteFieldId = useId()
  const noteCounterId = useId()
  const isOverLimit = value.length > WORKOUT_HISTORY_NOTE_MAX_LENGTH
  const canSave = !isSaving && !isOverLimit

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={noteFieldId} className={labelClassName}>
          Notatka
        </label>
        <textarea
          ref={textareaRef}
          id={noteFieldId}
          value={value}
          rows={4}
          maxLength={WORKOUT_HISTORY_NOTE_MAX_LENGTH}
          aria-describedby={noteCounterId}
          disabled={isSaving}
          className={textareaClassName}
          onChange={(event) => onChange(event.target.value)}
        />
        <p
          id={noteCounterId}
          className={[
            'mt-1 text-right font-display text-[11px] tabular-nums',
            isOverLimit ? 'text-crimson' : 'text-muted',
          ].join(' ')}
        >
          {value.length}/{WORKOUT_HISTORY_NOTE_MAX_LENGTH}
        </p>
      </div>

      {saveError ? (
        <p className="text-[13px] leading-relaxed text-crimson" role="alert">
          {saveError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="ghost" disabled={isSaving} onClick={onCancel}>
          Anuluj
        </Button>
        <Button type="button" size="sm" variant="primary" loading={isSaving} disabled={!canSave} onClick={onSave}>
          Zapisz
        </Button>
      </div>
    </div>
  )
}

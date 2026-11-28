import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { QuickTimerWorkoutSession } from '@/domain/workout-session/workoutSession.types'
import type { SparringIntensity } from '@/domain/workout/workout.types'
import { isQuickTimerCategory, type QuickTimerCategory } from '@/domain/quick-timer/quickTimer'
import type { QuickTimerFeedbackDraft } from '@/domain/quick-timer/quickTimerFeedback'
import { WorkoutFeedbackSummary } from '@/features/workout-feedback/WorkoutFeedbackSummary'
import { workoutFeedbackLabels as feedbackLabels } from '@/features/workout-feedback/workoutFeedbackLabels'
import { rpeLabels } from '@/features/workout-feedback/rpeLabels'
import { Button } from '@/components/ui/Button'
import { DisciplinePicker } from '@/components/ui/DisciplinePicker'
import { UnsavedPlanChangesGuard } from '@/features/workout-builder/components/UnsavedPlanChangesGuard'
import { QuickTimerCategoryField } from './QuickTimerCategoryField'
import { quickTimerLabels as labels } from './quickTimerLabels'
import './quickTimer.css'

export function QuickTimerFeedbackForm({ session, pending, hasPreviousCategory, rpeCard, onSave }: {
  session: QuickTimerWorkoutSession; pending: boolean; hasPreviousCategory: boolean; rpeCard: ReactNode
  onSave: (draft: QuickTimerFeedbackDraft) => Promise<void>
}) {
  const [initial] = useState(() => ({ category: isQuickTimerCategory(session.category) ? session.category : null, disciplineKey: session.disciplineKey,
    intensity: session.sparring[0]?.intensity ?? null, note: session.note ?? '' }))
  const [category, setCategory] = useState<QuickTimerCategory | null>(initial.category)
  const [disciplineKey, setDisciplineKey] = useState(initial.disciplineKey)
  const [intensity, setIntensity] = useState<SparringIntensity | null>(initial.intensity)
  const [note, setNote] = useState(initial.note)
  const allowLeave = useRef(false)
  const disciplineChanged = disciplineKey !== initial.disciplineKey
  const isDirty = disciplineChanged || category !== initial.category || intensity !== initial.intensity || note !== initial.note
  const [categoryError, setCategoryError] = useState<string>()
  const [noteError, setNoteError] = useState<string>()
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)
  const form = useRef<HTMLFormElement>(null)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy.current) return
    if (!category || note.trim().length > 1000) {
      setCategoryError(category ? undefined : 'Wybierz rodzaj treningu')
      setNoteError(note.trim().length > 1000 ? 'Notatka może mieć najwyżej 1000 znaków.' : undefined)
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    busy.current = true; setSaving(true); setError(false)
    // The save callback also navigates; restore protection if saving fails.
    allowLeave.current = true
    try { await onSave({ category, disciplineKey: disciplineChanged ? disciplineKey : undefined, intensity, note }) } catch { allowLeave.current = false; setError(true) }
    finally { busy.current = false; setSaving(false) }
  }
  return <UnsavedPlanChangesGuard isDirty={isDirty} allowLeaveRef={allowLeave} description={feedbackLabels.discardDescription}>
    <div className="quick-timer-screen mx-auto w-full max-w-xl">
      <WorkoutFeedbackSummary session={session} pending={pending} />
      <form ref={form} noValidate onSubmit={(event) => { void submit(event) }} className="quick-timer-stack">
        <fieldset disabled={saving} className="quick-timer-stack">
          <p className="border-l-[3px] border-ember py-0.5 pl-2.5 text-[12.5px] leading-[1.45] text-muted">
            {hasPreviousCategory ? labels.previousCategoryHint : labels.firstCategoryHint}
          </p>
          <QuickTimerCategoryField value={category} error={categoryError} onChange={(value) => { setCategory(value); setCategoryError(undefined); if (value !== 'sparring') setIntensity(null) }} />
          <fieldset className="min-w-0">
            <legend className="quick-timer-legend">{labels.discipline}</legend>
            <DisciplinePicker label={labels.discipline} value={disciplineKey} onChange={setDisciplineKey} />
          </fieldset>
          {category === 'sparring' && <fieldset className="min-w-0">
            <legend className="quick-timer-legend">{labels.intensity} <span className="font-sans text-[11px] font-normal normal-case tracking-normal">({labels.optional})</span></legend>
            <div className="grid gap-2">
              {(['light', 'technical', 'hard'] as const).map((value) => {
                const { name, description } = feedbackLabels.sparringOptions[value]
                return <button key={value} type="button" aria-pressed={intensity === value} onClick={() => setIntensity(intensity === value ? null : value)}
                  className="quick-timer-choice px-3 py-2.5 leading-[1.4]">
                  <strong className="font-extrabold">{name}</strong>{' — '}{description}
                </button>
              })}
            </div>
          </fieldset>}
        </fieldset>
        {rpeCard}
        <label className="block font-display text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{feedbackLabels.noteHeading}
          <textarea rows={3} maxLength={1000} value={note} disabled={saving} placeholder={feedbackLabels.notePlaceholder} aria-invalid={!!noteError} aria-describedby={noteError ? 'quick-timer-note-error' : undefined}
            onChange={(event) => { setNote(event.target.value); setNoteError(undefined) }} className="mt-2 block w-full resize-none rounded-[2px] border border-bd bg-bg p-3 font-sans text-base leading-[1.4] font-normal normal-case tracking-normal text-ink placeholder:text-faint" />
        </label>
        {noteError && <p id="quick-timer-note-error" role="alert" className="text-xs text-crimson-ink">{noteError}</p>}
        {error && <p role="alert" className="text-sm text-crimson-ink">{feedbackLabels.saveError}</p>}
        <Button type="submit" loading={saving} size="sm" className="quick-timer-submit mt-0.5">{feedbackLabels.done}</Button>
        <p className="text-center text-xs leading-normal text-muted">{rpeLabels.reminderHint}</p>
      </form>
    </div>
  </UnsavedPlanChangesGuard>
}

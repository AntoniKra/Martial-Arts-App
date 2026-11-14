import { useId, useRef, useState } from 'react'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { validateWellbeing, WELLBEING_FIELDS, WELLBEING_NOTE_LIMIT, WELLBEING_QUESTIONS_VERSION, type WellbeingEntry, type WellbeingField } from '@/domain/wellbeing/wellbeing'
import { wellbeingLabels as labels, wellbeingQuestions } from './wellbeingLabels'

export function WellbeingForm({ date, entry, onSave, onClose }: {
  date: string; entry?: WellbeingEntry; onSave: (entry: WellbeingEntry) => Promise<void>; onClose?: () => void
}) {
  const [answers, setAnswers] = useState<Record<WellbeingField, number | null>>(() => ({ sleep: entry?.sleep ?? null, energy: entry?.energy ?? null, soreness: entry?.soreness ?? null, stress: entry?.stress ?? null }))
  const [note, setNote] = useState(entry?.note ?? ''), [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false)
  const pending = useRef(false), id = useId()
  return <form aria-label={labels.title} className="space-y-5" onSubmit={(event) => {
    event.preventDefault()
    if (pending.current) return
    if (!validateWellbeing(answers, note)) { setError(labels.invalid); return }
    pending.current = true; setBusy(true); setError(null)
    const now = new Date().toISOString()
    void onSave({ date, sleep: answers.sleep!, energy: answers.energy!, soreness: answers.soreness!, stress: answers.stress!,
      note: note.trim() || null, questionsVersion: WELLBEING_QUESTIONS_VERSION, createdAt: entry?.createdAt ?? now, updatedAt: now })
      .then(() => { onClose?.() }).catch(() => setError(labels.failed)).finally(() => { pending.current = false; setBusy(false) })
  }}>
    <fieldset disabled={busy} className="min-w-0 space-y-5">
      {WELLBEING_FIELDS.map((field) => <fieldset key={field} className="min-w-0 space-y-2">
        <legend className="mb-2 text-sm font-semibold">{wellbeingQuestions[field].question}</legend>
        <div className="grid grid-cols-5 gap-1">{wellbeingQuestions[field].options.map((option, index) => <label key={option}
          className={`flex min-h-touch min-w-touch cursor-pointer flex-col items-center gap-1 border px-1 py-2 text-center text-[11px] leading-snug ${answers[field] === index + 1 ? 'border-ink bg-elevated text-ink' : 'border-bd text-muted'}`}>
          <input type="radio" name={`${id}-${field}`} value={index + 1} checked={answers[field] === index + 1} onChange={() => setAnswers((current) => ({ ...current, [field]: index + 1 }))} className="accent-[var(--app-ink)]" />
          <span className="text-sm font-semibold">{index + 1}</span><span>{option}</span>
        </label>)}</div>
      </fieldset>)}
      <div><label htmlFor={`${id}-note`} className="block text-sm font-semibold">{labels.note}</label>
        <textarea id={`${id}-note`} value={note} onChange={(event) => setNote(event.target.value)} maxLength={WELLBEING_NOTE_LIMIT}
          aria-describedby={`${id}-hint`} className="mt-2 min-h-touch w-full border border-bd bg-input p-3 text-base text-ink" />
        <p id={`${id}-hint`} className="text-xs text-muted">{labels.noteHint}</p></div>
    </fieldset>
    {error && <p role="alert" className="text-sm">{error}</p>}
    <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy} className={getButtonClassName({ variant: 'secondary', disabled: busy })}>{labels.save}</button>
      {onClose && <button type="button" disabled={busy} className={getButtonClassName({ variant: 'ghost', disabled: busy })} onClick={onClose}>Anuluj</button>}</div>
  </form>
}

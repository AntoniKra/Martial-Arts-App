import { useId, useRef, useState } from 'react'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { SegmentedScale } from '@/components/SegmentedScale'
import { validateWellbeing, WELLBEING_FIELDS, WELLBEING_NOTE_LIMIT, WELLBEING_QUESTIONS_VERSION, type WellbeingEntry, type WellbeingField } from '@/domain/wellbeing/wellbeing'
import { wellbeingLabels as labels, wellbeingQuestions } from './wellbeingLabels'

export function WellbeingForm({ date, entry, onSave, onClose, onSkip }: {
  date: string; entry?: WellbeingEntry; onSave: (entry: WellbeingEntry) => Promise<void>; onClose?: () => void; onSkip?: () => void
}) {
  const [answers, setAnswers] = useState<Record<WellbeingField, number | null>>(() => ({ sleep: entry?.sleep ?? null, energy: entry?.energy ?? null, soreness: entry?.soreness ?? null, stress: entry?.stress ?? null }))
  const [note, setNote] = useState(entry?.note ?? ''), [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false)
  const pending = useRef(false), id = useId()
  return <form aria-label={labels.title} className="space-y-3" onSubmit={(event) => {
    event.preventDefault()
    if (pending.current) return
    if (!validateWellbeing(answers, note)) { setError(labels.invalid); return }
    pending.current = true; setBusy(true); setError(null)
    const now = new Date().toISOString()
    void onSave({ date, sleep: answers.sleep!, energy: answers.energy!, soreness: answers.soreness!, stress: answers.stress!,
      note: note.trim() || null, questionsVersion: WELLBEING_QUESTIONS_VERSION, createdAt: entry?.createdAt ?? now, updatedAt: now })
      .then(() => { onClose?.() }).catch(() => setError(labels.failed)).finally(() => { pending.current = false; setBusy(false) })
  }}>
    <fieldset disabled={busy} className="min-w-0 space-y-3">
      {WELLBEING_FIELDS.map((field) => {
        const question = wellbeingQuestions[field], value = answers[field]
        const description = value === null ? labels.noSelection : question.options[value - 1]
        return <fieldset key={field} className="min-w-0 space-y-1">
          <legend className="mb-1 text-sm font-semibold">{question.question}</legend>
          <SegmentedScale min={1} max={5} value={value} disabled={busy} uniformFill className="h-12"
            label={question.question} valueText={description} describedBy={`${id}-${field}-description`}
            onChange={(next) => setAnswers((current) => ({ ...current, [field]: next }))} />
          <p id={`${id}-${field}-description`} aria-live="polite" aria-atomic="true" className="whitespace-nowrap text-sm font-semibold tabular-nums text-ink">{value === null ? '—' : `${value} · ${description}`}</p>
          <div aria-hidden="true" className="flex justify-between gap-3 text-[11px] leading-snug text-muted">
            <span className="max-w-[48%] break-normal hyphens-none">1 · {question.options[0]}</span>
            <span className="max-w-[48%] break-normal hyphens-none text-right">5 · {question.options[4]}</span>
          </div>
        </fieldset>
      })}
      <div><label htmlFor={`${id}-note`} className="block text-sm font-semibold">{labels.note}</label>
        <textarea id={`${id}-note`} value={note} onChange={(event) => setNote(event.target.value)} maxLength={WELLBEING_NOTE_LIMIT}
          aria-describedby={`${id}-hint`} className="mt-2 min-h-touch w-full border border-bd bg-input p-3 text-base text-ink" />
        <p id={`${id}-hint`} className="text-xs text-muted">{labels.noteHint}</p></div>
    </fieldset>
    {error && <p role="alert" className="text-sm">{error}</p>}
    <div className="flex items-center gap-3"><button type="submit" disabled={busy} className={getButtonClassName({ variant: 'primary', disabled: busy })}>{labels.save}</button>
      {onSkip && <button type="button" className={getButtonClassName({ variant: 'ghost' })} onClick={onSkip}>{labels.skip}</button>}
      {onClose && <button type="button" disabled={busy} className={getButtonClassName({ variant: 'ghost', disabled: busy })} onClick={onClose}>Anuluj</button>}</div>
  </form>
}

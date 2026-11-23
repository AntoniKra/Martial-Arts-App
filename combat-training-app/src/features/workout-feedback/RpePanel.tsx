import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { BackButton } from '@/components/ui/BackButton'
import { rpeLabels as labels } from './rpeLabels'
import { RpeScale } from './RpeScale'
import { FeedbackIcon } from './FeedbackIcon'
import { workoutFeedbackLabels } from './workoutFeedbackLabels'

export function RpePanel({ due, initialValue, onBack, onSave, onSkip }: {
  due: boolean; initialValue: number | null; onBack: () => void
  onSave: (value: number) => Promise<void>; onSkip: () => boolean
}) {
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus(); window.scrollTo(0, 0) }, [])
  async function save() {
    if (value === null || busy.current) return
    busy.current = true; setSaving(true); setError('')
    try { await onSave(value) } catch { setError(labels.saveError) } finally { busy.current = false; setSaving(false) }
  }
  return <section className="motion-controls mx-auto w-full max-w-xl px-4 py-3" aria-labelledby="rpe-question">
    <BackButton disabled={saving} onClick={onBack} />
    <div className="feedback-surface space-y-2.5 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="feedback-eyebrow">{labels.heading}</p>
        <span className="feedback-badge is-active">{workoutFeedbackLabels.rpeActive}</span>
      </div>
      <header className="space-y-0.5">
        {due && <p className="text-[11px] font-semibold text-crimson-ink">{labels.due}</p>}
        <h1 id="rpe-question" ref={heading} tabIndex={-1} className="font-display text-sm font-extrabold text-ink">{labels.question}</h1>
        <p className="text-[11.5px] leading-snug text-muted">{labels.hint}</p>
      </header>
      <fieldset disabled={saving} className="min-w-0">
        <legend className="sr-only">{labels.scale}</legend>
        <RpeScale value={value} onChange={setValue} disabled={saving} />
      </fieldset>
      {error && <p role="alert" className="text-[13px] text-crimson-ink">{error}</p>}
      <Button variant="secondary" disabled={value === null} loading={saving} size="sm" className="motion-press w-full rounded-sm uppercase"
        onClick={() => { void save() }}><span className="flex items-center gap-1.5 font-extrabold"><FeedbackIcon kind="check" size={14} />{labels.save(value)}</span></Button>
      <Button variant="ghost" disabled={saving} size="sm" className="w-full uppercase" onClick={() => { if (!onSkip()) setError(labels.skipError) }}>{labels.skip}</Button>
    </div>
  </section>
}

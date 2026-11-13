import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { rpeLabels as labels } from './rpeLabels'
import { RpeScale } from './RpeScale'

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
  return <section className="mx-auto w-full max-w-xl space-y-5 px-4 py-5" aria-labelledby="rpe-question">
    <button type="button" disabled={saving} onClick={onBack} className="min-h-touch text-[12px] font-semibold text-muted"><span aria-hidden="true">← </span>{labels.back}</button>
    <header className="space-y-3">
      {due && <p className="font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-crimson-ink">{labels.due}</p>}
      <h1 id="rpe-question" ref={heading} tabIndex={-1} className="font-display text-2xl font-bold text-ink">{labels.question}</h1>
      <p className="text-[13px] leading-relaxed text-muted">{labels.hint}</p>
    </header>
    <fieldset disabled={saving} className="min-w-0">
      <legend className="sr-only">{labels.scale}</legend>
      <RpeScale value={value} onChange={setValue} />
    </fieldset>
    {error && <p role="alert" className="text-[13px] text-crimson-ink">{error}</p>}
    <div className="space-y-2">
      <Button disabled={value === null} loading={saving} size="lg" className="w-full uppercase tracking-[0.1em]" onClick={() => { void save() }}>{labels.save(value)}</Button>
      <Button variant="ghost" disabled={saving} className="w-full uppercase tracking-[0.1em]" onClick={() => { if (!onSkip()) setError(labels.skipError) }}>{labels.skip}</Button>
    </div>
  </section>
}

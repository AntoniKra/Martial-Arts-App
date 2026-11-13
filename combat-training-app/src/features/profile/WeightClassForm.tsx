import { useRef, useState } from 'react'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { parseWeightClassLabel } from '@/domain/profile/bodyWeight'
import { profileInputClass } from './BodyWeightForm'
import { profileLabels as labels } from './profileLabels'

export function WeightClassForm({ current, onSave, onClose }: {
  current: string | null; onSave: (label: string | null) => Promise<void>; onClose: () => void
}) {
  const [input, setInput] = useState(current ?? ''), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null)
  const pending = useRef(false)
  async function save() {
    if (pending.current) return
    const label = parseWeightClassLabel(input)
    if (label === undefined) { setError(labels.invalidCategory); return }
    pending.current = true; setBusy(true); setError(null)
    try { await onSave(label); onClose() } catch { setError(labels.saveFailed); setBusy(false); pending.current = false }
  }
  return <form aria-label={labels.categoryInput} onSubmit={(event) => { event.preventDefault(); void save() }} className="space-y-3 border border-bd bg-elevated p-4">
    <label className="block text-sm">{labels.categoryInput}<input type="text" value={input} disabled={busy}
      onChange={(event) => setInput(event.target.value)} aria-describedby="weight-class-hint" className={profileInputClass} /></label>
    <p id="weight-class-hint" className="text-xs text-muted">{labels.categoryHint}</p>
    {error && <p role="alert" className="text-sm text-crimson-ink">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="submit" disabled={busy} className={getButtonClassName({ disabled: busy })}>{busy ? labels.saving : labels.saveCategory}</button>
      <button type="button" disabled={busy} className={getButtonClassName({ variant: 'secondary', disabled: busy })} onClick={onClose}>{labels.cancel}</button>
    </div>
  </form>
}

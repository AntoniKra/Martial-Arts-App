import { useRef, useState } from 'react'
import type { BodyWeight } from '@/domain/profile/profile.types'
import { isMeasurementDate, parseWeightKg } from '@/domain/profile/bodyWeight'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { profileLabels as labels, profileDateLabel, weightKgLabel } from './profileLabels'

export const profileInputClass = 'mt-2 block min-h-touch w-full border border-bd bg-input px-3 py-2 text-ink'

export function BodyWeightForm({ today, weights, editing, onSave, onClose }: {
  today: string; weights: readonly BodyWeight[]; editing: BodyWeight | null
  onSave: (weight: BodyWeight) => Promise<void>; onClose: () => void
}) {
  const [date, setDate] = useState(editing?.date ?? today)
  const [input, setInput] = useState(editing?.weightKg.toFixed(1).replace('.', ',') ?? '')
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null)
  const pending = useRef(false)
  const existing = weights.find((entry) => entry.date === date)
  async function save() {
    if (pending.current) return
    const weightKg = parseWeightKg(input)
    if (weightKg === null || !isMeasurementDate(date, today)) { setError(labels.invalidWeight); return }
    const now = new Date().toISOString()
    pending.current = true; setBusy(true); setError(null)
    try { await onSave({ date, weightKg, createdAt: existing?.createdAt ?? now, updatedAt: now }); onClose() }
    catch { setError(labels.saveFailed); pending.current = false; setBusy(false) }
  }
  return <form aria-label={editing ? `${labels.edit}: ${profileDateLabel(editing.date)}` : labels.add}
    onSubmit={(event) => { event.preventDefault(); void save() }} className="space-y-4 border border-bd bg-elevated p-4">
    <p className="text-sm leading-relaxed text-muted">{labels.instruction}</p>
    <label className="block text-sm">{labels.date}<input type="date" required value={date} max={today} disabled={busy || !!editing}
      onChange={(event) => setDate(event.target.value)} className={profileInputClass} /></label>
    <label className="block text-sm">{labels.kilograms}<input type="text" inputMode="decimal" required value={input} disabled={busy}
      onChange={(event) => setInput(event.target.value)} className={profileInputClass} /></label>
    {existing && <p role="status" className="text-sm">Masz już pomiar z tego dnia ({weightKgLabel(existing.weightKg)}). Zapis go zastąpi.</p>}
    {error && <p role="alert" className="text-sm text-crimson-ink">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="submit" disabled={busy} className={getButtonClassName({ disabled: busy })}>{busy ? labels.saving : labels.saveWeight}</button>
      <button type="button" disabled={busy} className={getButtonClassName({ variant: 'secondary', disabled: busy })} onClick={onClose}>{labels.cancel}</button>
    </div>
  </form>
}

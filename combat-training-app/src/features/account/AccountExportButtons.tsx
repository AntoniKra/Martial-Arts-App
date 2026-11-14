import { useRef, useState } from 'react'
import { useAuth } from '@/features/auth/authContext'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { accountLabels as labels } from './accountLabels'
import { useAccountAvailability } from './useAccountAvailability'
import { useAccountService } from './useAccountService'

export function AccountExportButtons({ jsonOnly = false, health = false, disabled = false }: { jsonOnly?: boolean; health?: boolean; disabled?: boolean }) {
  const auth = useAuth(), availability = useAccountAvailability(), account = useAccountService()
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const blocked = disabled || busy || availability.blocked || !account.service
  async function download(kind: 'json' | 'csv' | 'wellbeingCsv') {
    if (blocked || inFlight.current || auth.state.status !== 'ready' || !auth.state.session || !account.service) return
    inFlight.current = true
    setBusy(true); setError(null)
    try {
      const [{ buildAccountJson, buildJournalCsv, buildWellbeingCsv, exportFileName }, { downloadAccountFile }, { workoutSessionDocumentSchema }, { wellbeingDocumentSchema }] = await Promise.all([
        import('./dataExport'), import('@/infrastructure/browser/downloadAccountFile'), import('@/infrastructure/firebase/workoutDocumentSchemas'), import('@/infrastructure/firebase/wellbeingDocumentSchema'),
      ])
      const data = await account.service.readData(), now = new Date()
      const sessions = data.collections.workoutSessions.flatMap((document) => {
        const parsed = workoutSessionDocumentSchema.safeParse(document.data)
        return parsed.success ? [parsed.data] : []
      })
      const entries = (data.collections.readiness ?? []).flatMap((document) => {
        const parsed = wellbeingDocumentSchema.safeParse(document.data)
        return parsed.success && parsed.data.date === document.id ? [parsed.data] : []
      })
      const content = kind === 'json' ? buildAccountJson(data, auth.state.session, now) : kind === 'wellbeingCsv' ? buildWellbeingCsv(entries) : buildJournalCsv(sessions)
      await downloadAccountFile(content, exportFileName(kind, now), kind === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8')
    } catch { setError(labels.exportError) } finally { setBusy(false); inFlight.current = false }
  }
  return <div className="space-y-3">
    <button type="button" className={getButtonClassName({ variant: 'secondary', disabled: blocked })} disabled={blocked}
      onClick={() => void download('json')}>{labels.json}</button>
    {health && <p className="text-sm leading-relaxed text-muted">{labels.health}</p>}
    {!jsonOnly && <button type="button" className={getButtonClassName({ variant: 'secondary', disabled: blocked })} disabled={blocked}
      onClick={() => void download('csv')}>{labels.csv}</button>}
    {!jsonOnly && <button type="button" className={getButtonClassName({ variant: 'secondary', disabled: blocked })} disabled={blocked}
      onClick={() => void download('wellbeingCsv')}>{labels.wellbeingCsv}</button>}
    {availability.reason && <p role="status" className="text-sm text-muted">{availability.reason}</p>}
    {busy && <p role="status" className="text-sm">{labels.loading}</p>}
    {(error || account.error) && <p role="alert" className="text-sm text-crimson-ink">{error ?? labels.unavailable}</p>}
  </div>
}

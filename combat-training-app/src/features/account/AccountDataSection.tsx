import { useId, useState } from 'react'
import { AccountExportButtons } from './AccountExportButtons'
import { accountLabels as labels } from './accountLabels'

export function AccountDataSection({ health }: { health: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const contentId = useId()
  return <section aria-label={labels.title} className="space-y-4 border border-bd bg-surface p-4">
    <h3 className="font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{labels.title}</h3>
    <button type="button" aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded(!expanded)}
      className="min-h-touch w-full text-left text-sm font-semibold">{labels.download}</button>
    <div id={contentId} hidden={!expanded} className="space-y-4">
      <p className="text-sm leading-relaxed text-muted">{labels.intro}</p>
      <AccountExportButtons health={health} />
    </div>
  </section>
}

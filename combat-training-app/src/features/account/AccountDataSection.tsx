import { AccountExportButtons } from './AccountExportButtons'
import { accountLabels as labels } from './accountLabels'

export function AccountDataSection({ health }: { health: boolean }) {
  return <section aria-label={labels.title} className="space-y-4 border border-bd bg-surface p-4">
    <h3 className="font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{labels.title}</h3>
    <p className="text-sm leading-relaxed text-muted">{labels.intro}</p>
    <AccountExportButtons health={health} />
  </section>
}

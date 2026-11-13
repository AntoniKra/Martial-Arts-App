import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { AccountExportButtons } from './AccountExportButtons'
import { accountLabels as labels } from './accountLabels'

export function AccountDataSection({ health }: { health: boolean }) {
  return <section aria-label={labels.title} className="space-y-4 border border-bd bg-surface p-4">
    <h2 className="font-display text-xl font-semibold">{labels.title}</h2>
    <p className="text-sm leading-relaxed text-muted">{labels.intro}</p>
    <AccountExportButtons health={health} />
    <Link to={routes.deleteAccount} className={getButtonClassName({ variant: 'danger' })}>{labels.delete}</Link>
  </section>
}

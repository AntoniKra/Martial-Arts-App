import { useId, useState, type ReactNode } from 'react'
import { DisclosureChevron } from './DisclosureChevron'

export function CollapsibleCard({ title, description, children, className = '' }: {
  title: ReactNode; description?: ReactNode; children: ReactNode; className?: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return <div className={`disclosure-card ${className}`}>
    <button type="button" className="disclosure-trigger" aria-expanded={open} aria-controls={id}
      aria-describedby={description ? `${id}-description` : undefined} onClick={() => setOpen(!open)}>
      <span className="min-w-0 flex-1"><span>{title}</span>{description && <span id={`${id}-description`} aria-hidden="true" className="mt-1 block text-xs font-normal text-muted">{description}</span>}</span>
      <DisclosureChevron />
    </button>
    <div id={id} hidden={!open} className="disclosure-content">{children}</div>
  </div>
}

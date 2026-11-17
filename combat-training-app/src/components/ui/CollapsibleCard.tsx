import { useId, useState, type ReactNode } from 'react'

export function CollapsibleCard({ title, description, children, className = '' }: {
  title: ReactNode; description?: ReactNode; children: ReactNode; className?: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return <div className={`disclosure-card ${className}`}>
    <button type="button" className="disclosure-trigger" aria-expanded={open} aria-controls={id}
      aria-describedby={description ? `${id}-description` : undefined} onClick={() => setOpen(!open)}>
      <span className="min-w-0 flex-1"><span>{title}</span>{description && <span id={`${id}-description`} aria-hidden="true" className="mt-1 block text-xs font-normal text-muted">{description}</span>}</span>
      <svg aria-hidden="true" className="disclosure-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    <div id={id} hidden={!open} className="disclosure-content">{children}</div>
  </div>
}

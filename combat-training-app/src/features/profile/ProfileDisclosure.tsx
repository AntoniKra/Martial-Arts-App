import { useId, type ReactNode } from 'react'
import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon'

export function ProfileDisclosure({ id, title, summary, open, onToggle, children }: {
  id?: string; title: string; summary: ReactNode; open: boolean; onToggle: () => void; children: ReactNode
}) {
  const contentId = useId()
  return <section id={id} aria-label={title} className="scroll-mt-4 border border-bd bg-surface">
    <h2>
      <button type="button" aria-expanded={open} aria-controls={contentId} onClick={onToggle}
        className="flex min-h-touch w-full items-center justify-between gap-4 p-4 text-left">
        <span className="min-w-0 space-y-2">
          <span className="block font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</span>
          <span className="block text-sm font-normal text-ink">{summary}</span>
        </span>
        <span aria-hidden="true" className={`shrink-0 ${open ? 'rotate-90' : ''}`}><ChevronRightIcon /></span>
      </button>
    </h2>
    <div id={contentId} hidden={!open} className="space-y-4 border-t border-bd p-4">{children}</div>
  </section>
}

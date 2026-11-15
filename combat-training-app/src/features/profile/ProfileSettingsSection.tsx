import type { ReactNode } from 'react'

export function ProfileSettingsSection({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return <section id={id} aria-label={title} className="scroll-mt-4 space-y-4 border border-bd bg-surface p-4">
    <h3 className="font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</h3>
    {children}
  </section>
}

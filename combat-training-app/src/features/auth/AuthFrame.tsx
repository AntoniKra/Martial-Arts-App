import type { PropsWithChildren } from 'react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { authLabels } from './authLabels'

export function AuthFrame({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <div className="min-h-dvh bg-bg px-4 py-6 text-ink safe-area-pt">
      <div className="mx-auto flex max-w-md justify-end"><ThemeToggle /></div>
      <main className="mx-auto mt-8 w-full max-w-md border border-bd bg-surface p-6">
        <p className="mb-3 font-display text-sm uppercase tracking-widest text-muted">{authLabels.brand}</p>
        <h1 className="mb-6 font-display text-2xl font-bold">{title}</h1>
        {children}
      </main>
    </div>
  )
}

import type { ReactNode } from 'react'

export type WorkoutsEmptyStateVariant = 'no-plans' | 'no-history' | 'no-results'

interface WorkoutsEmptyStateProps {
  variant: WorkoutsEmptyStateVariant
  action?: ReactNode
}

const emptyStateCopy: Record<
  WorkoutsEmptyStateVariant,
  { title: string; description: string }
> = {
  'no-plans': {
    title: 'Brak zapisanych planów',
    description: 'Utwórz pierwszy plan treningowy, aby rozpocząć pracę nad techniką.',
  },
  'no-history': {
    title: 'Brak ukończonych treningów',
    description: 'Ukończ pierwszy trening, aby pojawił się w historii.',
  },
  'no-results': {
    title: 'Brak wyników dla filtrów',
    description: 'Zmień wyszukiwanie, dyscyplinę lub sortowanie, aby zobaczyć inne pozycje.',
  },
}

export function WorkoutsEmptyState({ variant, action }: WorkoutsEmptyStateProps) {
  const copy = emptyStateCopy[variant]
  const isFilterEmpty = variant === 'no-results'

  return (
    <div
      {...(isFilterEmpty ? { role: 'status', 'aria-live': 'polite' as const } : {})}
      className="flex flex-col items-center border border-bd bg-surface px-6 py-12 text-center"
    >
      <h3 className="font-display text-[15px] font-semibold text-ink">{copy.title}</h3>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted">{copy.description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

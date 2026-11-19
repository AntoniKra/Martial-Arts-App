import type { ReactNode } from 'react'

export function HomeParameterChip({ children, kind = 'rounds' }: { children: ReactNode; kind?: 'rounds' | 'clock' | 'club' | 'rest' | 'blocks' }) {
  return <span className="home-param-chip">
    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      {kind === 'clock' || kind === 'rounds' ? <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>
        : kind === 'club' ? <><path d="M3 21V7l9-4 9 4v14M8 21v-7h8v7M7 9h2m6 0h2" /></>
          : kind === 'blocks' ? <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>
            : <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />}
    </svg>{children}
  </span>
}

export function HomeActionIcon({ kind }: { kind: 'entry' | 'start' | 'omit' | 'move' | 'timer' }) {
  return <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    {kind === 'entry' ? <><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>
      : kind === 'start' ? <path d="m8 5 11 7-11 7Z" />
        : kind === 'omit' ? <><circle cx="12" cy="12" r="10" /><path d="m9 9 6 6m0-6-6 6" /></>
          : kind === 'timer' ? <><circle cx="12" cy="13" r="8" /><path d="M12 9v4M9 2h6" /></>
            : <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M14 14l3 3m0-3-3 3" /></>}
  </svg>
}

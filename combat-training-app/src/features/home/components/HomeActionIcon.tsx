export function HomeActionIcon({ kind }: { kind: 'entry' | 'start' | 'omit' | 'move' }) {
  return <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    {kind === 'entry' ? <><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>
      : kind === 'start' ? <path d="m8 5 11 7-11 7Z" />
        : kind === 'omit' ? <><circle cx="12" cy="12" r="10" /><path d="m9 9 6 6m0-6-6 6" /></>
          : <><path d="m9 14-5-5 5-5M20 20v-7a4 4 0 0 0-4-4H4" /></>}
  </svg>
}

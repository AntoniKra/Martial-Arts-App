const shapes = {
  entry: <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />,
  start: <path d="m8 5 11 7-11 7Z" />,
  omit: <><circle cx="12" cy="12" r="10" /><path d="m9 9 6 6m0-6-6 6" /></>,
  timer: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4M9 2h6" /></>,
  move: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M14 14l3 3m0-3-3 3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="m5 5 14 14M19 5 5 19" />,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  book: <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />,
  heart: <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />,
  arrow: <path d="M5 12h14m-7-7 7 7-7 7" />,
  right: <path d="m9 6 6 6-6 6" />,
  down: <path d="m6 9 6 6 6-6" />,
}

export function HomeActionIcon({ kind, className, strokeWidth = 2.5 }: {
  kind: keyof typeof shapes; className?: string; strokeWidth?: number
}) {
  return <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={className}>
    {shapes[kind]}
  </svg>
}

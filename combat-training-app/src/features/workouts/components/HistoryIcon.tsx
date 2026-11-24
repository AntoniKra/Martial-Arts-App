const paths = {
  calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 10h.01m4 0h.01m4 0h.01',
  list: 'M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1',
  note: 'M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6m-2-10 3 3-9 9-4 1 1-4 9-9Z',
  plus: 'M12 5v14M5 12h14',
} as const

export function HistoryIcon({ name, size = 16 }: { name: keyof typeof paths; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d={paths[name]} />
  </svg>
}

import { HomeActionIcon } from '@/features/home/components/HomeActionIcon'

const paths = {
  sparring: 'M6 11V6a3 3 0 0 1 6 0v5M12 11V4a3 3 0 0 1 6 0v7M18 11v6a5 5 0 0 1-10 0v-6',
  load: 'M22 12h-4l-3 9L9 3l-3 9H2',
  weight: 'm16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM7 21h10M12 3v18M3 7h18',
}

export type ProgressMoreIconKind = keyof typeof paths | 'wellbeing'

export function ProgressMoreIcon({ kind }: { kind: ProgressMoreIconKind }) {
  const className = 'shrink-0 text-crimson-ink'
  if (kind === 'wellbeing') return <HomeActionIcon kind="heart" className={className} strokeWidth={2} />
  return <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24"
    className={className} fill="none" stroke="currentColor" strokeWidth="2">
    <path d={paths[kind]} />
  </svg>
}

export function FeedbackIcon({ kind, size = 18, className = '' }: {
  kind: 'goal' | 'problem' | 'fix' | 'better' | 'same' | 'skip' | 'plus' | 'chevron' | 'clock' | 'check'; size?: number; className?: string
}) {
  return <svg aria-hidden="true" width={size} height={size} className={`shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
    {kind === 'goal' && <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>}
    {kind === 'problem' && <><path d="M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>}
    {kind === 'fix' && <path d="M9 18h6m-5 3h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3Z" />}
    {kind === 'better' && <path d="m7 7 10 10m0-9v9H8" />}
    {kind === 'same' && <path d="M4 12h15m-6-6 6 6-6 6" />}
    {kind === 'skip' && <path d="m5 4 10 8-10 8Zm14 1v14" />}
    {kind === 'plus' && <path d="M12 5v14M5 12h14" />}
    {kind === 'chevron' && <path d="m6 9 6 6 6-6" />}
    {kind === 'clock' && <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>}
    {kind === 'check' && <path d="m4 12 5 5L20 6" />}
  </svg>
}

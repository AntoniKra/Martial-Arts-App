import { useId } from 'react'

export function StormDecoration({ dimmed = false }: { dimmed?: boolean }) {
  const gradient = useId(), glow = useId()
  return <><span className="home-intro-spark" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg></span>
    <svg aria-hidden="true" focusable="false" className="storm-decoration" viewBox="0 0 320 310" fill="none">
      <defs>
        <linearGradient id={gradient} x1="50" y1="20" x2="280" y2="280" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--app-ember)" stopOpacity={dimmed ? 0.6 : 0.9} />
          <stop offset="45%" stopColor="var(--app-home-storm-crimson)" stopOpacity={dimmed ? 0.35 : 0.6} />
          <stop offset="100%" stopColor="var(--app-home-surface)" stopOpacity="0" />
        </linearGradient>
        <filter id={glow} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <path d="M190 10 L130 115 L175 115 L105 235 L215 130 L165 130 L220 10 Z" fill={`url(#${gradient})`} filter={`url(#${glow})`} />
      <path d="M225 35 L178 120 L212 120 L155 210 L240 130 L205 130 L248 35 Z" fill="var(--app-ember)" opacity={dimmed ? 0.2 : 0.3} />
      {!dimmed && <>
        <circle cx="215" cy="50" r="1.5" fill="var(--app-ember)" opacity="0.8" />
        <circle cx="120" cy="180" r="1" fill="var(--app-home-storm-spark)" opacity="0.7" />
        <circle cx="160" cy="90" r="2" fill="var(--app-home-primary-ink)" opacity="0.4" />
      </>}
    </svg>
  </>
}

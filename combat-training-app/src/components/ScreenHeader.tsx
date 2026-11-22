import type { ReactNode, Ref } from 'react'
import { useNavigate } from 'react-router-dom'
import { screenBackTarget } from './screenBackTarget'

const screenHeaderLabels = { back: 'Wstecz', close: 'Zamknij' } as const

const iconButton = 'flex size-11 shrink-0 items-center justify-center text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)] disabled:opacity-40'

export function ScreenHeader({ title, variant = 'subscreen', subtitle, action, onBack, disabled = false, headingRef, headingLevel = 1 }: {
  title: string
  variant?: 'main' | 'home' | 'subscreen' | 'form' | 'summary'
  subtitle?: ReactNode
  action?: ReactNode
  onBack?: () => void
  disabled?: boolean
  headingRef?: Ref<HTMLHeadingElement>
  headingLevel?: 1 | 2 | 4
}) {
  const Heading = `h${headingLevel}` as const
  if (variant === 'home') return <Heading className="sr-only">{title}</Heading>
  const main = variant === 'main'
  const summary = variant === 'summary'
  return <header className={`w-full ${summary ? 'space-y-2.5' : 'space-y-0.5'}`}>
    <div className={`flex min-h-11 items-center gap-1 ${main ? '' : '-ml-3'}`}>
      {!main && <button type="button" aria-label={variant === 'form' ? screenHeaderLabels.close : screenHeaderLabels.back} onClick={onBack} disabled={disabled} className={iconButton}>
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
          <path d={variant === 'form' ? 'M6 6l12 12M18 6 6 18' : summary ? 'M22 12H2m8-8-8 8 8 8' : 'm15 18-6-6 6-6'} />
        </svg>
      </button>}
      <Heading ref={headingRef} tabIndex={headingRef ? -1 : undefined} className={`min-w-0 flex-1 font-display leading-snug text-ink ${summary ? 'truncate text-xl font-semibold' : `break-words font-extrabold ${main ? 'text-[28px]' : 'text-[24px]'}`}`}>{title}</Heading>
      {action}
    </div>
    {subtitle && <div className="break-words text-[13px] text-muted">{subtitle}</div>}
  </header>
}

export function RouteScreenHeader({ fallback, ...props }: Omit<Parameters<typeof ScreenHeader>[0], 'onBack'> & { fallback: string }) {
  const navigate = useNavigate()
  return <ScreenHeader {...props} onBack={() => {
    const target = screenBackTarget(window.history.state, fallback)
    if (typeof target === 'number') void navigate(target)
    else void navigate(target)
  }} />
}

export function LiveScreenHeader({ exit, title, progress, action }: {
  exit: ReactNode
  title: string
  progress: ReactNode
  action: ReactNode
}) {
  return <header className="player-topbar">
    {exit}
    <div className="min-w-0 text-center">
      <p className="topbar-plan-title">{title}</p>
      <p className="player-step-progress">{progress}</p>
    </div>
    {action}
  </header>
}

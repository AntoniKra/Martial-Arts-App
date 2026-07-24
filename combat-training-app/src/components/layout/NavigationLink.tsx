import { Link, useLocation } from 'react-router-dom'

import { getNavigationIcon } from '@/components/layout/NavIcons'
import {
  isNavigationItemActive,
  type NavigationItemConfig,
} from '@/components/layout/navigationConfig'

interface NavigationLinkProps {
  item: NavigationItemConfig
  variant: 'mobile-default' | 'mobile-create' | 'desktop'
}

export function NavigationLink({ item, variant }: NavigationLinkProps) {
  const { pathname } = useLocation()
  const active = isNavigationItemActive(pathname, item)
  const icon = getNavigationIcon(item.id)

  if (variant === 'mobile-create') {
    return (
      <Link
        to={item.to}
        aria-current={active ? 'page' : undefined}
        className={[
          'relative flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 transition-colors',
          active ? 'text-crimson' : 'text-faint hover:text-muted',
        ].join(' ')}
      >
        <span
          className={[
            'flex size-9 items-center justify-center border transition-colors',
            active ? 'border-crimson bg-crimson/10' : 'border-bd',
          ].join(' ')}
        >
          {icon}
        </span>
        <span className="font-display text-[9px] font-semibold uppercase tracking-[0.1em]">{item.label}</span>
        {active ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-crimson"
          />
        ) : null}
      </Link>
    )
  }

  if (variant === 'desktop') {
    return (
      <Link
        to={item.to}
        aria-current={active ? 'page' : undefined}
        className={[
          'relative flex min-h-touch items-center gap-3 border-l-2 px-3 py-2.5 font-display text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors',
          active
            ? 'border-crimson bg-elevated font-bold text-ink shadow-[inset_0_0_0_1px_var(--app-border)]'
            : 'border-transparent text-muted hover:border-bd hover:bg-elevated/60 hover:text-ink',
        ].join(' ')}
      >
        {icon}
        <span>{item.label}</span>
      </Link>
    )
  }

  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      className={[
        'relative flex min-h-touch flex-1 flex-col items-center justify-center gap-1 transition-colors',
        active ? 'font-semibold text-ink' : 'text-faint hover:text-muted',
      ].join(' ')}
    >
      {icon}
      <span className="font-display text-[9px] font-semibold uppercase tracking-[0.1em]">{item.label}</span>
      {active ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 bg-crimson"
        />
      ) : null}
    </Link>
  )
}

import type { ComponentProps } from 'react'
import { NewWorkoutChoice } from './NewWorkoutChoice'
import { Link, useLocation } from 'react-router-dom'

import { NavigationIcon } from '@/components/layout/NavIcons'
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
  const icon = <NavigationIcon id={item.id} />

  if (variant === 'mobile-create') {
    return (
      <NavigationControl
        item={item}
        to={item.to}
        aria-current={active ? 'page' : undefined}
        className={[
          'relative flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 transition-colors',
          active ? 'text-crimson-ink' : 'text-faint hover:text-muted',
        ].join(' ')}
      >
        <span className="relative -mt-6 flex size-[50px] items-center justify-center">
          <span aria-hidden="true" className="new-workout-diamond" />
          <span className="relative text-on-accent [&>svg]:size-6">{icon}</span>
        </span>
        {/* Sits 2 px lower than the other labels so it clears the diamond. */}
        <span className="relative top-0.5 font-display text-[9px] font-semibold uppercase tracking-[0.1em]">{item.label}</span>
        {active ? (
          <span
            aria-hidden="true"
            className="accent-fill pointer-events-none absolute -top-px left-[24%] right-[24%] h-0.5"
          />
        ) : null}
      </NavigationControl>
    )
  }

  if (variant === 'desktop') {
    return (
      <NavigationControl
        item={item}
        to={item.to}
        aria-current={active ? 'page' : undefined}
        className={[
          'relative flex min-h-touch items-center gap-3 border-l-2 px-3 py-2.5 font-display text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors',
          active
            ? 'border-crimson bg-elevated font-bold text-ink shadow-[inset_0_0_0_1px_var(--app-border)]'
            : item.id === 'newWorkout' ? 'border-transparent text-crimson-ink hover:bg-elevated' : 'border-transparent text-muted hover:border-bd hover:bg-elevated/60 hover:text-ink',
        ].join(' ')}
      >
        <span className={active ? 'text-crimson-ink' : ''}>{icon}</span>
        <span>{item.label}</span>
      </NavigationControl>
    )
  }

  return (
    <NavigationControl
      item={item}
      to={item.to}
      aria-current={active ? 'page' : undefined}
      className={[
        'relative flex min-h-touch flex-1 flex-col items-center justify-center gap-1 transition-colors',
        active ? 'font-semibold text-ink' : 'text-faint hover:text-muted',
      ].join(' ')}
    >
      <span className={active ? 'text-crimson-ink' : ''}>{icon}</span>
      <span className="font-display text-[9px] font-semibold uppercase tracking-[0.1em]">{item.label}</span>
      {active ? (
        <span
          aria-hidden="true"
          className="accent-fill pointer-events-none absolute -top-px left-[24%] right-[24%] h-0.5"
        />
      ) : null}
    </NavigationControl>
  )
}

function NavigationControl({ item, ...props }: ComponentProps<typeof Link> & { item: NavigationItemConfig }) {
  if (item.id === 'newWorkout') return <NewWorkoutChoice active={props['aria-current'] === 'page'} className={props.className}>{props.children}</NewWorkoutChoice>
  return <Link {...props} />
}

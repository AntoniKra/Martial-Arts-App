import { NavLink } from 'react-router-dom'

import { routes } from '@/app/routes'

const items = [
  { to: routes.home, label: 'Start', end: true },
  { to: routes.workouts, label: 'Treningi', end: false },
  { to: routes.newWorkout, label: 'Nowy trening', end: true },
] as const

export function BottomNavigation() {
  return (
    <nav aria-label="Główna nawigacja" className="fixed inset-x-0 bottom-0 z-20 border-t border-bd bg-surface md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex min-h-16 items-center justify-center border-r border-bd px-2 font-display text-[11px] font-semibold uppercase tracking-[0.08em] last:border-r-0 ${
                isActive ? 'text-crimson' : 'text-muted hover:text-ink'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

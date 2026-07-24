import { primaryNavigationItems } from '@/components/layout/navigationConfig'
import { NavigationLink } from '@/components/layout/NavigationLink'

export function DesktopNavigation() {
  return (
    <nav
      aria-label="Główna nawigacja"
      className="hidden w-56 shrink-0 border-r border-bd bg-surface md:flex md:flex-col md:px-3 md:py-6"
    >
      <p className="mb-4 px-3 font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
        Nawigacja
      </p>
      <div className="flex flex-col gap-1">
        {primaryNavigationItems.map((item) => (
          <NavigationLink key={item.id} item={item} variant="desktop" />
        ))}
      </div>
    </nav>
  )
}

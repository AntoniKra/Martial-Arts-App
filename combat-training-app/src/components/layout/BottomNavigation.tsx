import { getMobileNavigationItems } from '@/components/layout/navigationConfig'
import { NavigationLink } from '@/components/layout/NavigationLink'

export function BottomNavigation() {
  const mobileNavigationItems = getMobileNavigationItems()

  return (
    <nav
      aria-label="Główna nawigacja"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-bd bg-surface safe-area-pb md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch">
        {mobileNavigationItems.map((item) => (
          <NavigationLink
            key={item.id}
            item={item}
            variant={item.mobileVariant === 'create' ? 'mobile-create' : 'mobile-default'}
          />
        ))}
      </div>
    </nav>
  )
}

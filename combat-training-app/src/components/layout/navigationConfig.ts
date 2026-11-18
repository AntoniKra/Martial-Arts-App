import { routes } from '@/app/routes'

export type NavigationItemId = 'home' | 'plan' | 'newWorkout' | 'progress' | 'profile'

export type NavigationMatchMode = 'exact' | 'progress' | 'section' | 'newWorkout'

export interface NavigationItemConfig {
  id: NavigationItemId
  to: string
  label: string
  match: NavigationMatchMode
  mobileVariant: 'default' | 'create'
}

export function normalizeNavigationPathname(pathname: string): string {
  if (pathname === '/') return '/'
  return pathname.replace(/\/+$/, '')
}

export function isNavigationItemActive(pathname: string, item: NavigationItemConfig): boolean {
  const normalizedPath = normalizeNavigationPathname(pathname)
  const normalizedTarget = normalizeNavigationPathname(item.to)

  switch (item.match) {
    case 'newWorkout':
      return [routes.newWorkout, routes.quickTimer, routes.newManualWorkout].some((path) => normalizedPath === path)
    case 'section':
      return normalizedPath === normalizedTarget || normalizedPath.startsWith(`${normalizedTarget}/`)
    case 'exact':
      return normalizedPath === normalizedTarget
    case 'progress':
      return (normalizedPath === normalizedTarget || normalizedPath.startsWith(`${normalizedTarget}/`)) &&
        normalizedPath !== routes.plan && !normalizedPath.startsWith(`${routes.plan}/`)
    default:
      return normalizedPath === normalizedTarget
  }
}

export const primaryNavigationItems: readonly NavigationItemConfig[] = [
  {
    id: 'home',
    to: routes.home,
    label: 'Start',
    match: 'exact',
    mobileVariant: 'default',
  },
  {
    id: 'plan',
    to: routes.plan,
    label: 'Plan',
    match: 'section',
    mobileVariant: 'default',
  },
  {
    id: 'newWorkout',
    to: routes.newWorkout,
    label: 'Trening',
    match: 'newWorkout',
    mobileVariant: 'create',
  },
  { id: 'progress', to: routes.progress, label: 'Postęp', match: 'progress', mobileVariant: 'default' },
  { id: 'profile', to: routes.profile, label: 'Profil', match: 'section', mobileVariant: 'default' },
] as const

export const mobileNavigationOrder = ['home', 'plan', 'newWorkout', 'progress', 'profile'] as const satisfies readonly NavigationItemId[]

function getNavigationItemById(id: NavigationItemId): NavigationItemConfig {
  const item = primaryNavigationItems.find((entry) => entry.id === id)
  if (!item) {
    throw new Error(`Unknown navigation item: ${id}`)
  }
  return item
}

export function getMobileNavigationItems(): readonly NavigationItemConfig[] {
  return mobileNavigationOrder.map(getNavigationItemById)
}

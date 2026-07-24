import { routes } from '@/app/routes'

export type NavigationItemId = 'home' | 'workouts' | 'newWorkout'

export type NavigationMatchMode = 'exact' | 'workoutsSection'

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
  const normalizedWorkouts = normalizeNavigationPathname(routes.workouts)
  const normalizedNewWorkout = normalizeNavigationPathname(routes.newWorkout)

  switch (item.match) {
    case 'exact':
      return normalizedPath === normalizedTarget
    case 'workoutsSection':
      if (normalizedPath === normalizedWorkouts) return true
      if (
        normalizedPath.startsWith(`${normalizedWorkouts}/`) &&
        !normalizedPath.startsWith(normalizedNewWorkout)
      ) {
        return true
      }
      return false
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
    id: 'workouts',
    to: routes.workouts,
    label: 'Treningi',
    match: 'workoutsSection',
    mobileVariant: 'default',
  },
  {
    id: 'newWorkout',
    to: routes.newWorkout,
    label: 'Nowy',
    match: 'exact',
    mobileVariant: 'create',
  },
] as const

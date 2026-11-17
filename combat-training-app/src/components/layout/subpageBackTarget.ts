import { routes } from '@/app/routes'

export function subpageBackTarget(key: string, historyIndex: unknown): -1 | string {
  return key !== 'default' && typeof historyIndex === 'number' && historyIndex > 0
    ? -1 : `${routes.workouts}?tab=history`
}

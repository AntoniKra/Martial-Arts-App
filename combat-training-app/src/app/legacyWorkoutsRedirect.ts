import { routes } from './routes'

export function legacyWorkoutsRedirect(search: string, hash = ''): string {
  const params = new URLSearchParams(search)
  if (params.get('tab') === 'history') return `${routes.progress}?${params}${hash}`

  params.delete('tab')
  return `${routes.workouts}${params.size ? `&${params}` : ''}${hash}`
}

import { routes } from './routes'

export function legacyHistoryRedirect(search: string, hash = ''): string | null {
  const params = new URLSearchParams(search)
  return params.get('tab') === 'history' ? `${routes.progress}?${params}${hash}` : null
}

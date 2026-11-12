import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { routes } from '@/app/routes'
import { Button } from '@/components/ui/Button'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { AuthFrame } from '@/features/auth/AuthFrame'
import { isChunkLoadError } from './isChunkLoadError'
import { routeErrorLabels as labels } from './routeErrorLabels'

export function RouteErrorScreen() {
  const error = useRouteError()
  useEffect(() => { console.error(error) }, [error])

  return <AuthFrame title={labels.title}>
    <p role="alert" className="text-sm leading-relaxed text-muted">
      {isChunkLoadError(error) ? labels.chunkLoadError : labels.unexpectedError}
    </p>
    <div className="mt-6 flex flex-col gap-3">
      <Button onClick={() => window.location.reload()}>{labels.reload}</Button>
      <a href={routes.home} className={getButtonClassName({ variant: 'secondary' })}>{labels.home}</a>
    </div>
  </AuthFrame>
}

import { useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'

import { Button } from '@/components/ui/Button'
import { shouldShowUpdatePrompt } from './shouldShowUpdatePrompt'

export function PwaUpdatePrompt() {
  const { pathname } = useLocation()
  const reloadPending = useRef(false)
  const refreshRequested = useRef(false)
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onNeedReload() {
      reloadPending.current = true
      // Another tab can activate the worker, or navigation can win the race.
      if (refreshRequested.current && shouldShowUpdatePrompt(true, window.location.pathname)) {
        window.location.reload()
      }
    },
  })

  if (!shouldShowUpdatePrompt(needRefresh, pathname)) return null

  function refresh() {
    // Recheck the live URL: navigation can happen before React commits a render.
    if (shouldShowUpdatePrompt(needRefresh, window.location.pathname)) {
      refreshRequested.current = true
      if (reloadPending.current) window.location.reload()
      else void updateServiceWorker(true)
    }
  }

  return (
    <aside aria-label="Aktualizacja aplikacji" className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-lg flex-wrap items-center justify-between gap-3 border border-bd bg-surface p-4 text-ink">
      <p role="status">Dostępna nowa wersja</p>
      <Button onClick={refresh}>Odśwież</Button>
    </aside>
  )
}

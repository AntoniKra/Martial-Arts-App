import { useEffect } from 'react'

import { createBrowserScreenWakeLock } from '@/infrastructure/wake-lock/browserScreenWakeLock'

export function useWorkoutScreenWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const wakeLock = createBrowserScreenWakeLock()
    wakeLock.activate()
    return () => wakeLock.dispose()
  }, [enabled])
}

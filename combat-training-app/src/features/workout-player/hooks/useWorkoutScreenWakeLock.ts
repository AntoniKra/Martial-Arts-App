import { useEffect } from 'react'

import { useScreenWakeLockFactory } from '@/application/wake-lock/screenWakeLockContext'

export function useWorkoutScreenWakeLock(enabled: boolean): void {
  const createWakeLock = useScreenWakeLockFactory()
  useEffect(() => {
    if (!enabled) {
      return
    }

    const wakeLock = createWakeLock()
    wakeLock.activate()
    return () => wakeLock.dispose()
  }, [enabled, createWakeLock])
}

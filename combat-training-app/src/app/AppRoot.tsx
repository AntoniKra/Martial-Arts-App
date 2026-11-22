import { Outlet } from 'react-router-dom'

import { ScreenWakeLockContext } from '@/application/wake-lock/screenWakeLockContext'
import { PwaUpdatePrompt } from '@/features/pwa/PwaUpdatePrompt'
import { createBrowserScreenWakeLock } from '@/infrastructure/wake-lock/browserScreenWakeLock'

export function AppRoot() {
  return (
    <>
      <ScreenWakeLockContext.Provider value={createBrowserScreenWakeLock}>
        <Outlet />
      </ScreenWakeLockContext.Provider>
      <PwaUpdatePrompt />
    </>
  )
}

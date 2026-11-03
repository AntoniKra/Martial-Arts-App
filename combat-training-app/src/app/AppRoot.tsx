import { Outlet } from 'react-router-dom'

import { PwaUpdatePrompt } from '@/features/pwa/PwaUpdatePrompt'

export function AppRoot() {
  return (
    <>
      <Outlet />
      <PwaUpdatePrompt />
    </>
  )
}

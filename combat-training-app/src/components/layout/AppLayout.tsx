import { Outlet } from 'react-router-dom'

import { BottomNavigation } from '@/components/layout/BottomNavigation'

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col pb-20 md:max-w-5xl md:pb-0">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  )
}

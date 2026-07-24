import { Outlet } from 'react-router-dom'

import { BottomNavigation } from '@/components/layout/BottomNavigation'
import { DesktopNavigation } from '@/components/layout/DesktopNavigation'

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink md:flex-row">
      <DesktopNavigation />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:max-w-5xl md:px-8 md:pb-8 md:pt-6">
          <Outlet />
        </main>
        <BottomNavigation />
      </div>
    </div>
  )
}

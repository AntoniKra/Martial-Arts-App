import { Outlet } from 'react-router-dom'

import { BottomNavigation } from '@/components/layout/BottomNavigation'
import { DesktopNavigation } from '@/components/layout/DesktopNavigation'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { SignOutButton } from '@/features/auth/SignOutButton'
import { useAuth } from '@/features/auth/authContext'

export function AppLayout() {
  const { error } = useAuth()
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink md:flex-row">
      <DesktopNavigation />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-end gap-3 px-4 pt-3 safe-area-pt">
          <SignOutButton />
          <div className="md:hidden"><ThemeToggle /></div>
        </div>
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:max-w-5xl md:px-8 md:pb-8 md:pt-6">
          {error && <p role="alert" className="px-4 text-sm text-crimson-ink">{error}</p>}
          <Outlet />
        </main>
        <BottomNavigation />
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import { BottomNavigation } from '@/components/layout/BottomNavigation'
import { DesktopNavigation } from '@/components/layout/DesktopNavigation'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useWorkoutData } from '@/application/workoutDataContext'
import { SignOutButton } from '@/features/auth/SignOutButton'

export function AppLayout() {
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const { plans, sessions, focusSkills, weekPlans } = useWorkoutData()
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink md:flex-row">
      <DesktopNavigation />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-end gap-3 px-4 pt-3 safe-area-pt">
          <SignOutButton hasPendingWrites={plans.hasPendingWrites || sessions.hasPendingWrites || focusSkills.hasPendingWrites || weekPlans.hasPendingWrites}
            disabled={plans.status === 'loading' || sessions.status === 'loading' || focusSkills.status === 'loading' || weekPlans.status === 'loading'} onError={setSignOutError} />
          <div className="md:hidden"><ThemeToggle /></div>
        </div>
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col pb-[calc(4rem+13px+env(safe-area-inset-bottom,0px))] md:max-w-5xl md:px-8 md:pb-8 md:pt-6">
          {signOutError && <p role="alert" className="px-4 text-sm text-crimson-ink">{signOutError}</p>}
          <Outlet />
        </main>
        <BottomNavigation />
      </div>
    </div>
  )
}

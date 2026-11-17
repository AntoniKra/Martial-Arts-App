import { Outlet } from 'react-router-dom'

import { BottomNavigation } from '@/components/layout/BottomNavigation'
import { DesktopNavigation } from '@/components/layout/DesktopNavigation'
import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'

export function AppLayout() {
  const { exercises, retryExercises } = useWorkoutData()
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink md:flex-row">
      <DesktopNavigation />
      <div className="flex min-w-0 flex-1 flex-col safe-area-pt">
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col pb-[calc(68px+13px+env(safe-area-inset-bottom,0px))] md:max-w-5xl md:px-8 md:pb-8 md:pt-6">
          {exercises.status === 'error' && <div role="alert" className="px-4 text-sm text-crimson-ink">
            <p>{workoutDataLabels.exercisesLoadError}</p><button type="button" className="min-h-touch" onClick={retryExercises}>Spróbuj ponownie</button>
          </div>}
          <Outlet />
        </main>
        <BottomNavigation />
      </div>
    </div>
  )
}

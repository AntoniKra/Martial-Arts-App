import { createBrowserRouter } from 'react-router-dom'

import { AppRoot } from '@/app/AppRoot'
import { AppLayout } from '@/components/layout/AppLayout'
import { HomePage } from '@/pages/HomePage'
import { NewWorkoutPage } from '@/pages/NewWorkoutPage'
import { EditWorkoutPage } from '@/pages/EditWorkoutPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { WorkoutPlayerPage } from '@/pages/WorkoutPlayerPage'
import { WorkoutDetailsPage } from '@/pages/WorkoutDetailsPage'
import { WorkoutsPage } from '@/pages/WorkoutsPage'

export const router = createBrowserRouter([
  {
    element: <AppRoot />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/workouts', element: <WorkoutsPage /> },
          { path: '/workouts/new', element: <NewWorkoutPage /> },
          { path: '/workouts/:workoutId', element: <WorkoutDetailsPage /> },
          { path: '/workouts/:workoutId/edit', element: <EditWorkoutPage /> },
          { path: '/workouts/:workoutId/preview', element: <PlaceholderPage title="Podgląd treningu" /> },
          { path: '/workouts/:workoutId/report', element: <PlaceholderPage title="Raport treningu" /> },
        ],
      },
      { path: '/workouts/:workoutId/active', element: <WorkoutPlayerPage /> },
      { path: '/workouts/:workoutId/feedback', element: <PlaceholderPage title="Podsumowanie treningu" fullscreen /> },
    ],
  },
])

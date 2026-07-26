import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { HomePage } from '@/pages/HomePage'
import { NewWorkoutPage } from '@/pages/NewWorkoutPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { WorkoutPlayerPage } from '@/pages/WorkoutPlayerPage'
import { WorkoutDetailsPage } from '@/pages/WorkoutDetailsPage'
import { WorkoutsPage } from '@/pages/WorkoutsPage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/workouts', element: <WorkoutsPage /> },
      { path: '/workouts/new', element: <NewWorkoutPage /> },
      { path: '/workouts/:workoutId', element: <WorkoutDetailsPage /> },
      { path: '/workouts/:workoutId/edit', element: <PlaceholderPage title="Edycja planu" /> },
      { path: '/workouts/:workoutId/preview', element: <PlaceholderPage title="Podgląd treningu" /> },
      { path: '/workouts/:workoutId/report', element: <PlaceholderPage title="Raport treningu" /> },
    ],
  },
  { path: '/workouts/:workoutId/active', element: <WorkoutPlayerPage /> },
  { path: '/workouts/:workoutId/feedback', element: <PlaceholderPage title="Podsumowanie treningu" fullscreen /> },
])

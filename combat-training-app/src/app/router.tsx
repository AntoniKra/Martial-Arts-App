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
import { AuthGate } from '@/features/auth/AuthGate'
import { AuthFormPage } from '@/features/auth/AuthFormPage'
import { VerifyEmailPage } from '@/features/auth/VerifyEmailPage'

export const router = createBrowserRouter([
  {
    element: <AppRoot />,
    children: [
      {
        element: <AuthGate />,
        children: [
          { path: '/login', element: <AuthFormPage key="login" mode="login" /> },
          { path: '/register', element: <AuthFormPage key="register" mode="register" /> },
          { path: '/forgot-password', element: <AuthFormPage key="forgot-password" mode="forgot-password" /> },
          { path: '/verify-email', element: <VerifyEmailPage /> },
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
    ],
  },
])

import { createBrowserRouter, Outlet } from 'react-router-dom'

import { WorkoutDataProvider } from '@/app/WorkoutDataProvider'
import { AppRoot } from '@/app/AppRoot'
import { AppLayout } from '@/components/layout/AppLayout'
import { HomePage } from '@/pages/HomePage'
import { NewWorkoutPage } from '@/pages/NewWorkoutPage'
import { EditWorkoutPage } from '@/pages/EditWorkoutPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { WorkoutPlayerPage } from '@/pages/WorkoutPlayerPage'
import { WorkoutDetailsPage } from '@/pages/WorkoutDetailsPage'
import { WorkoutFeedbackPage } from '@/pages/WorkoutFeedbackPage'
import { WorkoutsPage } from '@/pages/WorkoutsPage'
import { AuthGate } from '@/features/auth/AuthGate'
import { AuthFormPage } from '@/features/auth/AuthFormPage'
import { VerifyEmailPage } from '@/features/auth/VerifyEmailPage'
import { ActiveWorkoutGate } from '@/features/workout-player/ActiveWorkoutGate'

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
          { element: <ActiveWorkoutGate />, children: [
          {
            element: <WorkoutDataProvider><Outlet /></WorkoutDataProvider>,
            children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/', element: <HomePage /> },
              { path: '/workouts', element: <WorkoutsPage /> },
              { path: '/progress', lazy: () => import('@/pages/ProgressPage') },
              { path: '/progress/focus-skills/:focusSkillId', lazy: () => import('@/pages/FocusSkillProgressPage') },
              { path: '/workout-sessions/:sessionId/feedback', element: <WorkoutFeedbackPage /> },
              { path: '/workouts/new', element: <NewWorkoutPage /> },
              { path: '/workouts/:workoutId', element: <WorkoutDetailsPage /> },
              { path: '/workouts/:workoutId/edit', element: <EditWorkoutPage /> },
              { path: '/workouts/:workoutId/preview', element: <PlaceholderPage title="Podgląd treningu" /> },
              { path: '/workouts/:workoutId/report', element: <PlaceholderPage title="Raport treningu" /> },
            ],
          },
          { path: '/workouts/:workoutId/active', element: <WorkoutPlayerPage /> },
            ],
          },
          ] },
        ],
      },
    ],
  },
])

import { createBrowserRouter, Outlet } from 'react-router-dom'

import { WorkoutDataProvider } from '@/app/WorkoutDataProvider'
import { AppRoot } from '@/app/AppRoot'
import { AppLayout } from '@/components/layout/AppLayout'
import { HomePage } from '@/pages/HomePage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { WorkoutsPage } from '@/pages/WorkoutsPage'
import { AuthGate } from '@/features/auth/AuthGate'
import { AuthFormPage } from '@/features/auth/AuthFormPage'
import { VerifyEmailPage } from '@/features/auth/VerifyEmailPage'
import { ActiveWorkoutGate } from '@/features/workout-player/ActiveWorkoutGate'
import { AuthLoadingScreen } from '@/features/auth/AuthLoadingScreen'
import { RouteErrorScreen } from '@/app/RouteErrorScreen'

export const router = createBrowserRouter([
  {
    element: <AppRoot />,
    errorElement: <RouteErrorScreen />,
    hydrateFallbackElement: <AuthLoadingScreen />,
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
              { path: '/progress/week/:weekStart', lazy: () => import('@/pages/WeekPlanPage') },
              { path: '/progress/focus-skills/:focusSkillId', lazy: () => import('@/pages/FocusSkillProgressPage') },
              { path: '/workout-sessions/:sessionId/feedback', lazy: () => import('@/pages/WorkoutFeedbackPage') },
              { path: '/workouts/new', lazy: () => import('@/pages/NewWorkoutPage') },
              { path: '/workouts/:workoutId', lazy: () => import('@/pages/WorkoutDetailsPage') },
              { path: '/workouts/:workoutId/edit', lazy: () => import('@/pages/EditWorkoutPage') },
              { path: '/workouts/:workoutId/preview', element: <PlaceholderPage title="Podgląd treningu" /> },
              { path: '/workouts/:workoutId/report', element: <PlaceholderPage title="Raport treningu" /> },
            ],
          },
          { path: '/workouts/:workoutId/active', lazy: () => import('@/pages/WorkoutPlayerPage') },
            ],
          },
          ] },
        ],
      },
    ],
  },
])

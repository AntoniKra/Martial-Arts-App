import { createBrowserRouter, Outlet } from 'react-router-dom'

import { WorkoutDataProvider } from '@/app/WorkoutDataProvider'
import { AppRoot } from '@/app/AppRoot'
import { AppLayout } from '@/components/layout/AppLayout'
import { HomePage } from '@/pages/HomePage'
import { LegacyWorkoutsRedirect } from '@/pages/LegacyWorkoutsRedirect'
import { AuthGate } from '@/features/auth/AuthGate'
import { AuthFormPage } from '@/features/auth/AuthFormPage'
import { VerifyEmailPage } from '@/features/auth/VerifyEmailPage'
import { ActiveWorkoutGate } from '@/features/workout-player/ActiveWorkoutGate'
import { AuthLoadingScreen } from '@/features/auth/AuthLoadingScreen'
import { RouteErrorScreen } from '@/app/RouteErrorScreen'
import { createActiveWorkoutRepository } from '@/infrastructure/storage/activeWorkoutStorage'
import { createCompletedWorkoutStorage } from '@/infrastructure/storage/completedWorkoutStorage'

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
          { element: <ActiveWorkoutGate createRepository={createActiveWorkoutRepository} createCompletedStorage={createCompletedWorkoutStorage} />, children: [
          {
            element: <WorkoutDataProvider><Outlet /></WorkoutDataProvider>,
            children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/', element: <HomePage /> },
              { path: '/workouts', element: <LegacyWorkoutsRedirect /> },
              { path: '/exercises', lazy: () => import('@/pages/MyExercisesPage') },
              { path: '/my-exercises', lazy: () => import('@/pages/MyExercisesPage') },
              { path: '/progress', lazy: () => import('@/pages/ProgressPage') },
              { path: '/profile', lazy: () => import('@/pages/ProfilePage') },
              { path: '/profile/delete-account', lazy: () => import('@/pages/DeleteAccountPage') },
              { path: '/profile/consent', lazy: () => import('@/pages/ProfileConsentPage') },
              { path: '/profile/wellbeing-consent', lazy: () => import('@/pages/WellbeingConsentPage') },
              { path: '/progress/week/:weekStart?', lazy: () => import('@/pages/WeekPlanPage') },
              { path: '/progress/focus-skills/:focusSkillId', lazy: () => import('@/pages/FocusSkillProgressPage') },
              { path: '/workout-sessions/:sessionId/feedback', lazy: () => import('@/pages/WorkoutFeedbackPage') },
              { path: '/workout-sessions/new', lazy: () => import('@/pages/ManualWorkoutPage') },
              { path: '/workout-sessions/:sessionId/edit', lazy: () => import('@/pages/ManualWorkoutPage') },
              { path: '/quick-timer', lazy: () => import('@/pages/QuickTimerPage') },
              { path: '/workouts/new', lazy: () => import('@/pages/NewWorkoutPage') },
              { path: '/workouts/:workoutId', lazy: () => import('@/pages/WorkoutDetailsPage') },
              { path: '/workouts/:workoutId/edit', lazy: () => import('@/pages/EditWorkoutPage') },
            ],
          },
          { path: '/quick-timer/active', lazy: () => import('@/pages/QuickTimerPlayerPage') },
          { path: '/workouts/:workoutId/active', lazy: () => import('@/pages/WorkoutPlayerPage') },
            ],
          },
          ] },
        ],
      },
    ],
  },
])

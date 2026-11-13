import { useCallback, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import * as z from 'zod/mini'
import { routes } from '@/app/routes'
import { useWorkoutData } from '@/application/workoutDataContext'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { workoutPlanDocumentSchema } from '@/infrastructure/firebase/workoutDocumentSchemas'
import { useActiveWorkout } from '@/features/workout-player/activeWorkoutContext'
import { InterruptedWorkoutDialog } from '@/features/workout-player/components/InterruptedWorkoutDialog'
import { WorkoutPlayerView } from '@/features/workout-player/components/WorkoutPlayerView'

const stateSchema = z.object({ quickTimerPlan: workoutPlanDocumentSchema })

export function Component() {
  const navigate = useNavigate()
  const location = useLocation()
  const { recovery, repository } = useActiveWorkout()
  const { sessionRepository } = useWorkoutData()
  const [restored] = useState(() => recovery.kind !== 'none' && recovery.workout.source === 'quickTimer' ? recovery : null)
  const [plan] = useState(() => {
    if (restored) return restored.workout.plan
    const result = stateSchema.safeParse(location.state)
    if (!result.success) return null
    const { schemaVersion: _version, ...value } = result.data.quickTimerPlan
    return value
  })
  const saveWorkoutSession = useCallback((session: WorkoutSession) => sessionRepository.save(session), [sessionRepository])
  const onSessionSaved = useCallback((id: string) => { void navigate(routes.workoutFeedback(id), { replace: true }) }, [navigate])
  if (!plan) return <Navigate to={routes.quickTimer} replace />
  if (restored?.kind === 'interrupted') return <InterruptedWorkoutDialog planName={plan.nameSnapshot} lastSeenAt={restored.workout.lastSeenAt}
    onSave={async () => { await saveWorkoutSession(restored.session); repository.clear(); await navigate(routes.workoutFeedback(restored.session.id), { replace: true }) }}
    onDiscard={() => { repository.clear(); void navigate(routes.home, { replace: true }) }} />
  return <WorkoutPlayerView source="quickTimer" loadState={{ status: 'success', plan }} workoutsListPath={routes.workouts}
    workoutDetailsPath={routes.quickTimer} onRetry={() => {}} saveWorkoutSession={saveWorkoutSession} onSessionSaved={onSessionSaved}
    initialWorkout={restored?.kind === 'resume' ? restored.workout : undefined} activeWorkoutRepository={repository} />
}

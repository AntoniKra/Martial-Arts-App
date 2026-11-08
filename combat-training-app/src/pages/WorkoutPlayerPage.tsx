import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkoutData, useWorkoutPlan } from '@/application/workoutDataContext'
import { routes } from '@/app/routes'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { WorkoutPlayerView } from '@/features/workout-player/components/WorkoutPlayerView'

export function WorkoutPlayerPage() {
  const { workoutId = '' } = useParams()
  const { loadState: latest, retry } = useWorkoutPlan(workoutId)
  const [snapshot, setSnapshot] = useState<{ id: string; plan: WorkoutPlan | null }>({ id: workoutId, plan: null })
  if (snapshot.id !== workoutId) setSnapshot({ id: workoutId, plan: null })
  else if (!snapshot.plan && latest.status === 'success') setSnapshot({ id: workoutId, plan: latest.plan })
  // An admitted workout keeps its immutable plan even if the account or library changes elsewhere.
  const loadState = snapshot.id === workoutId && snapshot.plan ? { status: 'success' as const, plan: snapshot.plan } : latest
  const { sessionRepository } = useWorkoutData()
  const saveWorkoutSession = useCallback((session: WorkoutSession) => sessionRepository.save(session), [sessionRepository])
  return <WorkoutPlayerView loadState={loadState} workoutsListPath={routes.workouts}
    workoutDetailsPath={routes.workoutDetails(workoutId)} onRetry={retry} saveWorkoutSession={saveWorkoutSession} />
}

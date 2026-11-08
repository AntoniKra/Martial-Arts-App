import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkoutData, useWorkoutPlan } from '@/application/workoutDataContext'
import { routes } from '@/app/routes'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { WorkoutPlayerView } from '@/features/workout-player/components/WorkoutPlayerView'
import { useActiveWorkout } from '@/features/workout-player/activeWorkoutContext'
import { InterruptedWorkoutDialog } from '@/features/workout-player/components/InterruptedWorkoutDialog'

export function WorkoutPlayerPage() {
  const navigate = useNavigate()
  const { workoutId = '' } = useParams()
  const { recovery, repository } = useActiveWorkout()
  const [restored] = useState(() => recovery.kind !== 'none' && recovery.workout.plan.id === workoutId ? recovery : null)
  const { loadState: latest, retry } = useWorkoutPlan(workoutId)
  const [snapshot, setSnapshot] = useState<{ id: string; plan: WorkoutPlan | null }>({ id: workoutId, plan: restored?.workout.plan ?? null })
  if (snapshot.id !== workoutId) setSnapshot({ id: workoutId, plan: null })
  else if (!snapshot.plan && latest.status === 'success') setSnapshot({ id: workoutId, plan: latest.plan })
  // An admitted workout keeps its immutable plan even if the account or library changes elsewhere.
  const loadState = snapshot.id === workoutId && snapshot.plan ? { status: 'success' as const, plan: snapshot.plan } : latest
  const { sessionRepository } = useWorkoutData()
  const saveWorkoutSession = useCallback((session: WorkoutSession) => sessionRepository.save(session), [sessionRepository])
  if (restored?.kind === 'interrupted') return <InterruptedWorkoutDialog
    planName={restored.workout.plan.nameSnapshot} lastSeenAt={restored.workout.lastSeenAt}
    onSave={async () => {
      await saveWorkoutSession(restored.session)
      repository.clear()
      await navigate(`${routes.workouts}?tab=history`, { replace: true })
    }}
    onDiscard={() => { repository.clear(); void navigate(routes.home, { replace: true }) }}
  />
  return <WorkoutPlayerView loadState={loadState} workoutsListPath={routes.workouts}
    initialWorkout={restored?.kind === 'resume' ? restored.workout : undefined} activeWorkoutRepository={repository}
    workoutDetailsPath={routes.workoutDetails(workoutId)} onRetry={retry} saveWorkoutSession={saveWorkoutSession} />
}

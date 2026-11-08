import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkoutData, useWorkoutPlan } from '@/application/workoutDataContext'
import { routes } from '@/app/routes'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
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
  const { focusSkills } = useWorkoutData()
  const [snapshot, setSnapshot] = useState<{ id: string; plan: WorkoutPlan | null; skills: FocusSkill[] | null }>({
    id: workoutId, plan: restored?.workout.plan ?? null, skills: restored ? [] : null,
  })
  if (snapshot.id !== workoutId) setSnapshot({ id: workoutId, plan: null, skills: null })
  else if (!snapshot.plan && latest.status === 'success') setSnapshot({ id: workoutId, plan: latest.plan,
    skills: focusSkills.status === 'ready' ? structuredClone(focusSkills.items) : null })
  else if (snapshot.skills === null && focusSkills.status === 'ready') setSnapshot({ ...snapshot, skills: structuredClone(focusSkills.items) })
  // An admitted workout keeps its immutable plan even if the account or library changes elsewhere.
  const needsSkills = !restored && snapshot.plan?.blocks.some((block) => block.items.some((item) => item.type === 'exercise' && item.focusSkillId))
  const loadState = needsSkills && snapshot.skills === null
    ? focusSkills.status === 'error' ? { status: 'error' as const, message: 'Nie udało się wczytać ćwiczeń celu.' } : { status: 'loading' as const }
    : snapshot.id === workoutId && snapshot.plan ? { status: 'success' as const, plan: snapshot.plan } : latest
  const { sessionRepository } = useWorkoutData()
  const saveWorkoutSession = useCallback((session: WorkoutSession) => sessionRepository.save(session), [sessionRepository])
  const onSessionSaved = useCallback((id: string) => { void navigate(routes.workoutFeedback(id), { replace: true }) }, [navigate])
  if (restored?.kind === 'interrupted') return <InterruptedWorkoutDialog
    planName={restored.workout.plan.nameSnapshot} lastSeenAt={restored.workout.lastSeenAt}
    onSave={async () => {
      await saveWorkoutSession(restored.session)
      repository.clear()
      await navigate(routes.workoutFeedback(restored.session.id), { replace: true })
    }}
    onDiscard={() => { repository.clear(); void navigate(routes.home, { replace: true }) }}
  />
  return <WorkoutPlayerView loadState={loadState} workoutsListPath={routes.workouts}
    focusSkills={snapshot.skills ?? []} onSessionSaved={onSessionSaved}
    initialWorkout={restored?.kind === 'resume' ? restored.workout : undefined} activeWorkoutRepository={repository}
    workoutDetailsPath={routes.workoutDetails(workoutId)} onRetry={retry} saveWorkoutSession={saveWorkoutSession} />
}

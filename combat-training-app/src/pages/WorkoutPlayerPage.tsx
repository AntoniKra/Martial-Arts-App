import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkoutData, useWorkoutPlan } from '@/application/workoutDataContext'
import { routes } from '@/app/routes'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import { countFocusExercises } from '@/domain/focus-skill/focusSkillSelectors'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { WorkoutPlayerView } from '@/features/workout-player/components/WorkoutPlayerView'
import { useActiveWorkout } from '@/features/workout-player/activeWorkoutContext'
import { InterruptedWorkoutDialog } from '@/features/workout-player/components/InterruptedWorkoutDialog'
import { selectWorkoutFocusSkills, WORKOUT_FOCUS_SKILLS_WAIT_MS } from '@/features/workout-player/utils/selectWorkoutFocusSkills'

export function WorkoutPlayerPage() {
  const navigate = useNavigate()
  const { workoutId = '' } = useParams()
  const { recovery, repository } = useActiveWorkout()
  const [restored] = useState(() => recovery.kind !== 'none' && recovery.workout.plan.id === workoutId ? recovery : null)
  const { loadState: latest, retry } = useWorkoutPlan(workoutId)
  const { focusSkills } = useWorkoutData()
  const [snapshot, setSnapshot] = useState<{ id: string; plan: WorkoutPlan | null; skills: FocusSkill[] | null; focusSkillsUnavailable?: boolean }>({
    id: workoutId, plan: restored?.workout.plan ?? null, skills: restored ? [] : null,
  })
  const [expiredWait, setExpiredWait] = useState<WorkoutPlan | null>(null)
  if (snapshot.id !== workoutId) setSnapshot({ id: workoutId, plan: null, skills: null })
  else if (!snapshot.plan && latest.status === 'success') setSnapshot({ id: workoutId, plan: latest.plan,
    skills: null })
  else if (snapshot.plan && snapshot.skills === null) {
    const skills = selectWorkoutFocusSkills(snapshot.plan.blocks, focusSkills, expiredWait === snapshot.plan)
    if (skills !== null) setSnapshot({ ...snapshot, skills: structuredClone(skills),
      focusSkillsUnavailable: focusSkills.status === 'error' && countFocusExercises(snapshot.plan.blocks) > 0 })
  }
  const waitingPlan = snapshot.id === workoutId && snapshot.skills === null ? snapshot.plan : null
  useEffect(() => {
    if (!waitingPlan) return
    const timeout = window.setTimeout(() => setExpiredWait(waitingPlan), WORKOUT_FOCUS_SKILLS_WAIT_MS)
    return () => window.clearTimeout(timeout)
  }, [waitingPlan])
  // An admitted workout keeps its immutable plan even if the account or library changes elsewhere.
  const loadState = snapshot.id === workoutId && snapshot.plan && snapshot.skills === null
    ? { status: 'loading' as const }
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
    focusSkills={snapshot.skills ?? []} focusSkillsUnavailable={snapshot.focusSkillsUnavailable} onSessionSaved={onSessionSaved}
    initialWorkout={restored?.kind === 'resume' ? restored.workout : undefined} activeWorkoutRepository={repository}
    workoutDetailsPath={routes.workoutDetails(workoutId)} onRetry={retry} saveWorkoutSession={saveWorkoutSession} />
}

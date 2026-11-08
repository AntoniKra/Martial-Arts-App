import { workoutDataLabels } from '@/application/workoutDataLabels'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useWorkoutData } from '@/application/workoutDataContext'
import { WorkoutsView } from '@/features/workouts/components/WorkoutsView'
import { WorkoutDataWarning } from '@/features/workouts/components/WorkoutDataWarning'
import { mapWorkoutPlansToListItems } from '@/features/workouts/mappers/workoutPlanListItemMapper'
import { mapWorkoutSessionsToHistoryListItems } from '@/features/workouts/mappers/workoutSessionHistoryListItemMapper'
import { normalizeWorkoutHistoryNote } from '@/features/workouts/utils/normalizeWorkoutHistoryNote'

function isPlanDeletedNavigationState(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'planDeleted' in state && state.planDeleted === true
}

export function WorkoutsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [planDeleted] = useState(() => isPlanDeletedNavigationState(location.state))
  useEffect(() => {
    if (isPlanDeletedNavigationState(location.state)) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
    }
  }, [location.pathname, location.search, location.state, navigate])
  const { plans, sessions, sessionRepository, retry } = useWorkoutData()
  return <>
    <WorkoutDataWarning />
    <WorkoutsView planDeleted={planDeleted}
      plansLoadState={plans.status === 'ready' ? { status: 'success', plans: mapWorkoutPlansToListItems(plans.items) }
        : plans.status === 'loading' ? { status: 'loading' } : { status: 'error', message: workoutDataLabels.plansLoadError }}
      historyLoadState={sessions.status === 'ready' ? { status: 'success', sessions: mapWorkoutSessionsToHistoryListItems(sessions.items, sessions.pendingIds) }
        : sessions.status === 'loading' ? { status: 'loading' } : { status: 'error', message: workoutDataLabels.historyLoadError }}
      onRetryLoadPlans={retry} onRetryLoadHistory={retry} onHistoryActivated={() => {}}
      onUpdateSessionNote={async (id, note) => {
        if (!await sessionRepository.updateNote(id, normalizeWorkoutHistoryNote(note))) throw new Error('Session not found')
        return 'applied'
      }}
      onDeleteSession={async (id) => {
        if (!await sessionRepository.delete(id)) throw new Error('Session not found')
        return 'applied'
      }}
    />
  </>
}

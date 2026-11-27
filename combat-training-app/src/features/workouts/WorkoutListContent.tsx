import { workoutDataLabels } from '@/application/workoutDataLabels'
import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useWorkoutData } from '@/application/workoutDataContext'
import { WorkoutsView } from '@/features/workouts/components/WorkoutsView'
import { WorkoutDataWarning } from '@/features/workouts/components/WorkoutDataWarning'
import { mapWorkoutPlansToListItems } from '@/features/workouts/mappers/workoutPlanListItemMapper'
import { mapWorkoutSessionsToHistoryListItems } from '@/features/workouts/mappers/workoutSessionHistoryListItemMapper'
import { normalizeWorkoutHistoryNote } from '@/features/workouts/utils/normalizeWorkoutHistoryNote'
import { normalizeHistoryWeek } from '@/features/workouts/utils/historyWeeks'

function isPlanDeletedNavigationState(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'planDeleted' in state && state.planDeleted === true
}

export function WorkoutListContent({ history = false }: { history?: boolean }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [planDeleted] = useState(() => isPlanDeletedNavigationState(location.state))
  useEffect(() => {
    if (isPlanDeletedNavigationState(location.state)) {
      navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { replace: true, state: null })
    }
  }, [location.pathname, location.search, location.hash, location.state, navigate])
  const { plans, sessions, sessionRepository, retry } = useWorkoutData()
  const params = new URLSearchParams(location.search)
  const requestedWeek = history ? params.get('week') : null
  const week = normalizeHistoryWeek(requestedWeek)
  if (requestedWeek !== week) {
    if (week) params.set('week', week)
    else params.delete('week')
    return <Navigate to={{ pathname: location.pathname, search: params.toString(), hash: location.hash }} replace state={location.state} />
  }
  return <>
    <WorkoutDataWarning />
    <WorkoutsView planDeleted={planDeleted} tab={history ? 'history' : 'plans'} historyWeek={week}
      plansLoadState={plans.status === 'ready' ? { status: 'success', plans: mapWorkoutPlansToListItems(plans.items) }
        : plans.status === 'loading' ? { status: 'loading' } : { status: 'error', message: workoutDataLabels.plansLoadError }}
      historyLoadState={sessions.status === 'ready' ? { status: 'success', sessions: mapWorkoutSessionsToHistoryListItems(sessions.items, sessions.pendingIds) }
        : sessions.status === 'loading' ? { status: 'loading' } : { status: 'error', message: workoutDataLabels.historyLoadError }}
      onRetryLoadPlans={retry} onRetryLoadHistory={retry}
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

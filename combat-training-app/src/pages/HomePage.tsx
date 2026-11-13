import { workoutDataLabels } from '@/application/workoutDataLabels'
import { useWorkoutData } from '@/application/workoutDataContext'
import { HomeView } from '@/features/home/components/HomeView'
import { mapWorkoutPlanToFeaturedPlan } from '@/features/home/mappers/workoutPlanToFeaturedPlan'
import { mapWorkoutSessionToHomeRecentSession } from '@/features/home/mappers/workoutSessionToHomeRecentSession'
import { selectLatestWorkoutPlan } from '@/features/home/utils/selectLatestWorkoutPlan'
import { selectRecentWorkoutSessions } from '@/features/home/utils/selectRecentWorkoutSessions'
import { WorkoutDataWarning } from '@/features/workouts/components/WorkoutDataWarning'
import { RpeReminder } from '@/features/home/components/RpeReminder'
import { useAuth } from '@/features/auth/authContext'
import { WeekPlanSummary } from '@/features/week-plan/WeekPlanSummary'

export function HomePage() {
  const { plans, sessions, retry } = useWorkoutData()
  const { state } = useAuth()
  const uid = state.status === 'ready' ? state.session?.uid : undefined
  const latest = selectLatestWorkoutPlan(plans.items)
  return <>
    <WorkoutDataWarning />
    <HomeView
      weekPlan={<WeekPlanSummary />}
      rpeReminder={uid && sessions.status === 'ready' ? <RpeReminder key={uid} uid={uid} sessions={sessions.items} /> : null}
      featuredPlanLoadState={plans.status === 'ready'
        ? { status: 'success', plan: latest ? mapWorkoutPlanToFeaturedPlan(latest) : null }
        : plans.status === 'loading' ? { status: 'loading' } : { status: 'error', message: workoutDataLabels.plansLoadError }}
      recentSessionsLoadState={sessions.status === 'ready'
        ? { status: 'success', sessions: selectRecentWorkoutSessions(sessions.items).map((session) => mapWorkoutSessionToHomeRecentSession(session, sessions.pendingIds.has(session.id))) }
        : sessions.status === 'loading' ? { status: 'loading' } : { status: 'error', message: workoutDataLabels.historyLoadError }}
      onRetryLoadFeaturedPlan={retry} onRetryLoadRecentSessions={retry}
    />
  </>
}

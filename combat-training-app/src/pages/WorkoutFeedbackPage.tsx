import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useWorkoutData } from '@/application/workoutDataContext'
import { routes } from '@/app/routes'
import { prepareWorkoutFeedback } from '@/domain/workout-session/workoutFeedback'
import { findPreviousPlanRun } from '@/domain/workout-session/previousPlanRun'
import { WorkoutFeedbackForm } from '@/features/workout-feedback/WorkoutFeedbackForm'
import { workoutFeedbackLabels as labels } from '@/features/workout-feedback/workoutFeedbackLabels'
import { WorkoutDataWarning } from '@/features/workouts/components/WorkoutDataWarning'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/authContext'
import { prepareQuickTimerFeedback } from '@/domain/quick-timer/quickTimerFeedback'
import { QuickTimerFeedbackForm } from '@/features/quick-timer/QuickTimerFeedbackForm'
import { WorkoutRpeSummary } from '@/features/workout-feedback/WorkoutRpeSummary'

export function Component() {
  const { sessionId = '' } = useParams()
  const { sessions, plans, focusSkills, sessionRepository, retry } = useWorkoutData()
  const { state } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  if (sessions.status === 'loading') return <p role="status" className="p-4 text-muted">{labels.loading}</p>
  if (sessions.status === 'error') return <div className="space-y-4 p-4">
    <h1 className="font-display text-lg text-ink">{labels.loadError}</h1><Button onClick={retry}>Spróbuj ponownie</Button>
  </div>
  const session = sessions.items.find((value) => value.id === sessionId)
  if (!session || session.source === 'manual') return <div className="space-y-4 p-4">
    <h1 className="font-display text-lg text-ink">{labels.unavailable}</h1><Link to={`${routes.workouts}?tab=history`}>{labels.back}</Link>
  </div>
  if (session.source === 'plan' && focusSkills.status === 'loading') return <p role="status" className="p-4 text-muted">{labels.loading}</p>
  if (session.source === 'plan' && focusSkills.status === 'error') return <div className="space-y-4 p-4"><h1 className="font-display text-lg text-ink">{labels.loadError}</h1><Button onClick={retry}>Spróbuj ponownie</Button></div>
  const uid = state.status === 'ready' ? state.session?.uid : undefined
  if (!uid) return null
  return <><WorkoutDataWarning /><WorkoutRpeSummary key={session.id} session={session} uid={uid} initialOpen={searchParams.get('rpe') === '1'}
    onSave={async (value, recordedAt) => {
      if (!await sessionRepository.saveRpe(session.id, value, recordedAt)) throw new Error('Session no longer available')
    }}>{(rpeCard) => session.source === 'quickTimer' ? <QuickTimerFeedbackForm key={session.id} session={session} pending={sessions.pendingIds.has(session.id)} rpeCard={rpeCard}
      onSave={async (draft) => {
        const feedback = prepareQuickTimerFeedback(session, draft, new Date().toISOString())
        if (!await sessionRepository.saveQuickTimerFeedback(session.id, feedback)) throw new Error('Session no longer available')
        await navigate(`${routes.workouts}?tab=history`)
      }} /> : <WorkoutFeedbackForm key={session.id} session={session} skills={focusSkills.items} rpeCard={rpeCard}
    previousRun={findPreviousPlanRun(session, sessions.items, plans.status === 'ready' ? plans.items.find((plan) => plan.id === session.workoutPlanId) : undefined)}
    pending={sessions.pendingIds.has(session.id)} onSave={async (draft) => {
      const feedback = prepareWorkoutFeedback(session, draft, focusSkills.items, new Date().toISOString())
      if (!await sessionRepository.saveFeedback(session.id, feedback)) throw new Error('Session no longer available')
      await navigate(`${routes.workouts}?tab=history`)
    }} />}</WorkoutRpeSummary></>
}

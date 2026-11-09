import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useWorkoutData } from '@/application/workoutDataContext'
import { routes } from '@/app/routes'
import { prepareWorkoutFeedback } from '@/domain/workout-session/workoutFeedback'
import { WorkoutFeedbackForm } from '@/features/workout-feedback/WorkoutFeedbackForm'
import { workoutFeedbackLabels as labels } from '@/features/workout-feedback/workoutFeedbackLabels'
import { WorkoutDataWarning } from '@/features/workouts/components/WorkoutDataWarning'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/authContext'
import { WorkoutRpeSummary } from '@/features/workout-feedback/WorkoutRpeSummary'

export function WorkoutFeedbackPage() {
  const { sessionId = '' } = useParams()
  const { sessions, focusSkills, sessionRepository, retry } = useWorkoutData()
  const { state } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  if (sessions.status === 'loading' || focusSkills.status === 'loading') return <p role="status" className="p-4 text-muted">{labels.loading}</p>
  if (sessions.status === 'error' || focusSkills.status === 'error') return <div className="space-y-4 p-4">
    <h1 className="font-display text-lg text-ink">{labels.loadError}</h1><Button onClick={retry}>Spróbuj ponownie</Button>
  </div>
  const session = sessions.items.find((value) => value.id === sessionId)
  if (session?.source !== 'plan') return <div className="space-y-4 p-4">
    <h1 className="font-display text-lg text-ink">{labels.unavailable}</h1><Link to={`${routes.workouts}?tab=history`}>{labels.back}</Link>
  </div>
  const uid = state.status === 'ready' ? state.session?.uid : undefined
  if (!uid) return null
  return <><WorkoutDataWarning /><WorkoutRpeSummary key={session.id} session={session} uid={uid} initialOpen={searchParams.get('rpe') === '1'}
    onSave={async (value, recordedAt) => {
      if (!await sessionRepository.saveRpe(session.id, value, recordedAt)) throw new Error('Session no longer available')
    }}>{(rpeCard) => <WorkoutFeedbackForm session={session} skills={focusSkills.items} rpeCard={rpeCard}
    pending={sessions.pendingIds.has(session.id)} onSave={async (draft) => {
      const feedback = prepareWorkoutFeedback(session, draft, focusSkills.items, new Date().toISOString())
      if (!await sessionRepository.saveFeedback(session.id, feedback)) throw new Error('Session no longer available')
      await navigate(`${routes.workouts}?tab=history`)
    }} />}</WorkoutRpeSummary></>
}

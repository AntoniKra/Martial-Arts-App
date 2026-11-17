import { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { RouteScreenHeader } from '@/components/ScreenHeader'
import { routes } from '@/app/routes'
import { useWorkoutData } from '@/application/workoutDataContext'
import { buildManualWorkoutSession } from '@/domain/workout-session/manualWorkoutEntry'
import { prepareWorkoutFeedback } from '@/domain/workout-session/workoutFeedback'
import { Button } from '@/components/ui/Button'
import { ManualWorkoutForm } from '@/features/manual-workout/ManualWorkoutForm'
import { manualWorkoutLabels as labels } from '@/features/manual-workout/manualWorkoutLabels'
import { readClubWorkoutPrefill } from '@/infrastructure/browser/readClubWorkoutPrefill'
import { calculateWorkoutDate } from '@/domain/workout-session/workoutSessionDefinitions'

export function Component() {
  const { sessionId } = useParams()
  const location = useLocation()
  const [newId] = useState(() => crypto.randomUUID())
  const { sessions, focusSkills, sessionRepository, retry, retryFocusSkills } = useWorkoutData()
  const prefill = !sessionId && location.state && typeof location.state === 'object' && 'weekEntry' in location.state
    ? readClubWorkoutPrefill(location.state.weekEntry, calculateWorkoutDate(new Date().toISOString(), Intl.DateTimeFormat().resolvedOptions().timeZone)) : undefined
  const returnTo = location.state && typeof location.state === 'object' && 'returnTo' in location.state && location.state.returnTo === '/'
    ? routes.home : prefill ? routes.weekPlan(prefill.weekStart) : `${routes.workouts}?tab=history`
  if (sessions.status === 'loading') return <div className="space-y-4 p-4"><RouteScreenHeader variant="form" title={labels.title} fallback={returnTo} /><p role="status" className="text-muted">{labels.loading}</p></div>
  if (sessions.status === 'error' || sessions.invalidDocumentIds.length) return <div className="space-y-4 p-4">
    <RouteScreenHeader variant="form" title={labels.loadError} fallback={returnTo} /><Button onClick={retry}>{labels.retry}</Button>
  </div>
  const original = sessions.items.find((session) => session.id === sessionId)
  if (sessionId && original?.source !== 'manual') return <div className="space-y-4 p-4">
    <RouteScreenHeader variant="form" title={original ? labels.unavailable : labels.missing} fallback={returnTo} />
  </div>
  const manual = original?.source === 'manual' ? original : undefined
  return <ManualWorkoutForm key={sessionId ?? 'new'} original={manual} prefill={prefill} sessions={sessions.items} skills={focusSkills.items}
    skillsStatus={focusSkills.invalidDocumentIds.length ? 'error' : focusSkills.status} onRetrySkills={retryFocusSkills} returnTo={returnTo}
    onSave={async (values, available) => {
      const now = new Date().toISOString()
      const session = buildManualWorkoutSession({ ...values, focusRatings: available ? values.focusRatings : manual?.focusRatings ?? [] },
        { id: newId, now, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, original: manual })
      const feedback = prepareWorkoutFeedback({ ...session, focusRatings: manual?.focusRatings ?? [] },
        { focusRatings: session.focusRatings, note: session.note }, available ? focusSkills.items : [], now)
      await sessionRepository.saveManual({ ...session, focusRatings: feedback.focusRatings }, feedback.correctionUpdates)
    }} />
}

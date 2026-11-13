import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { selectRpeReminder } from '@/domain/workout-session/rpeReminder'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { createRpeDismissalStorage } from '@/infrastructure/storage/rpeDismissalStorage'
import { rpeLabels } from '@/features/workout-feedback/rpeLabels'
import { formatWorkoutSessionDatePl } from '@/features/workouts/utils/formatWorkoutSessionLabels'
import { workoutSessionName } from '@/features/workouts/utils/workoutSessionPresentation'
import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon'

export function RpeReminder({ sessions, uid }: { sessions: readonly WorkoutSession[]; uid: string }) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const refresh = () => setNow(Date.now())
    const timer = setInterval(refresh, 1000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('storage', refresh)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('storage', refresh) }
  }, [])
  const session = selectRpeReminder(sessions, createRpeDismissalStorage(uid).read(), now)
  if (!session) return null
  return <Link to={`${routes.workoutFeedback(session.id)}?rpe=1`}
    className="flex min-h-touch items-center justify-between gap-3 border border-crimson bg-surface p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]">
    <span className="min-w-0 break-words text-[13px] font-semibold leading-relaxed text-ink">{rpeLabels.reminder(workoutSessionName(session), formatWorkoutSessionDatePl(session.workoutDate))}</span>
    <ChevronRightIcon className="shrink-0 text-crimson-ink" />
  </Link>
}

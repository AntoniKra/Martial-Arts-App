import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import type { HomeRecentSession } from '../types/homeView.types'
import { homeLabels as labels } from '../homeLabels'
import { homeSecondaryButton } from './HomeScheduleCards'
import { workoutPlayerLabels } from '@/features/workout-player/workoutPlayerLabels'
import { workoutDataLabels } from '@/application/workoutDataLabels'

export function RecentSessionCard({ session }: { session: HomeRecentSession }) {
  const path = session.editPath ?? routes.workoutReport(session.id)
  return <section aria-label={labels.last} className="home-recent-session">
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
        <h2>{labels.last}: {session.dateLabelPl}</h2>
        <Link to={routes.progressHistory} className="inline-flex min-h-touch items-center text-[11px] font-bold text-crimson-ink">{labels.history} ›</Link>
      </div>
      <Link to={path} state={session.isManual ? { returnTo: routes.home } : undefined} className="flex min-h-touch flex-col justify-center">
        <h3 className="break-words text-[13px] font-bold">{session.name}</h3>
        <p className="text-xs font-bold tabular-nums">{session.durationLabelPl}{session.rpe !== null && <> · <span className="rpe-badge">RPE {session.rpe}</span></>}</p>
      </Link>
      {session.hasPendingWrites && <p role="status" className="text-xs text-muted">{workoutDataLabels.pending}</p>}
      {session.rpe === null && <Link to={`${routes.workoutFeedback(session.id)}?rpe=1`} className={homeSecondaryButton}>{labels.fillRpe}</Link>}
    </div>
    <span className={`home-session-status ${session.status === 'completed' ? 'is-done' : 'is-partial'}`}>{workoutPlayerLabels.sessionStatus[session.status]}</span>
  </section>
}

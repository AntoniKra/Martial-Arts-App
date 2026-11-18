import { ScreenHeader } from '@/components/ScreenHeader'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { routes } from '@/app/routes'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { homeCardDate, homeLabels as labels } from '../homeLabels'
import { StormDecoration } from './StormDecoration'
import { HomeQuickStart } from './HomeQuickStart'
import { homeInlineLink, homePrimaryButton, homeSecondaryButton, homeSectionLabel } from './HomeScheduleCards'
import type { HomeRecentSession, RecentWorkoutSessionsLoadState, FeaturedWorkoutPlanLoadState } from '../types/homeView.types'

interface HomeViewProps {
  today: string
  featuredPlanLoadState: FeaturedWorkoutPlanLoadState
  recentSessionsLoadState: RecentWorkoutSessionsLoadState
  onRetryLoadFeaturedPlan: () => void
  onRetryLoadRecentSessions: () => void
  primary?: ReactNode
  overdue?: ReactNode
  weekPlan?: ReactNode
  rpeReminder?: ReactNode
  wellbeing?: ReactNode
  empty?: boolean
  timerLabel: string
}

function LastSession({ session }: { session: HomeRecentSession }) {
  const path = session.editPath ?? routes.workoutReport(session.id)
  return <section aria-label={labels.last} className="flex flex-col gap-1.5 border border-bd bg-surface p-4">
    <div className="flex flex-wrap items-center justify-between gap-x-2">
      <h2 className={homeSectionLabel}>{labels.last} · {session.dateLabelPl}</h2>
      <Link to={routes.progressHistory} className={homeInlineLink}>{labels.history} ›</Link>
    </div>
    <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-crimson-ink">{labels.discipline(session.disciplineKey)}</p>
    <Link to={path} state={session.isManual ? { returnTo: routes.home } : undefined} className="inline-flex min-h-touch items-center">
      <h3 className="break-words font-display text-[17px] font-bold">{session.name}</h3>
    </Link>
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm tabular-nums text-muted">{session.durationLabelPl}</p>{session.rpe !== null && <span className="status-badge rpe-badge">RPE {session.rpe}</span>}</div>
    {session.hasPendingWrites && <p role="status" className="text-xs text-muted">{workoutDataLabels.pending}</p>}
    {session.rpe === null && <Link to={`${routes.workoutFeedback(session.id)}?rpe=1`} className={`${homeSecondaryButton} self-start`}>{labels.fillRpe}</Link>}
  </section>
}

export function HomeView({ today, featuredPlanLoadState, recentSessionsLoadState, onRetryLoadFeaturedPlan, onRetryLoadRecentSessions,
  primary, overdue, weekPlan, rpeReminder, wellbeing, empty, timerLabel }: HomeViewProps) {
  return <div className="flex-1">
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-4 pt-14 md:max-w-2xl md:pb-6 md:pt-2">
      <ScreenHeader variant="home" title={labels.heading} />
      {empty ? <section aria-label={labels.quickStart} className="storm-card flex flex-col gap-3 p-4">
        <StormDecoration />
        <div className="min-h-[350px] space-y-3 md:min-h-0">
          <p className={`${homeSectionLabel} text-crimson-ink`}>{homeCardDate(today)}</p>
          <h2 className="storm-copy font-display text-[30px] font-extrabold leading-[1.05]">{labels.empty}</h2>
          <p className="storm-copy text-sm text-muted">{labels.emptyHint}</p>
        </div>
        <Link to={routes.newWorkout} className={homePrimaryButton}>{labels.createPlan}</Link>
        <Link to={routes.newManualWorkout} state={{ returnTo: routes.home }} className={homeSecondaryButton}>{labels.firstClub}</Link>
      </section> : <>
        {primary ?? <HomeQuickStart today={today} state={featuredPlanLoadState} timerLabel={timerLabel} onRetry={onRetryLoadFeaturedPlan} />}
        {overdue}
        {weekPlan}
        {recentSessionsLoadState.status === 'loading' ? <p role="status" className="text-sm text-muted">{labels.loadingSessions}</p>
          : recentSessionsLoadState.status === 'error' ? <div role="alert" className="space-y-2 border border-bd p-4 text-sm text-muted">
            <p>{recentSessionsLoadState.message}</p><button type="button" onClick={onRetryLoadRecentSessions} className={homeSecondaryButton}>{labels.retry}</button>
          </div> : recentSessionsLoadState.sessions[0] && <LastSession session={recentSessionsLoadState.sessions[0]} />}
      </>}
      {rpeReminder}
      {wellbeing}
    </div>
  </div>
}

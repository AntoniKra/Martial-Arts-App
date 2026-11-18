import { ScreenHeader } from '@/components/ScreenHeader'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { routes } from '@/app/routes'
import { homeCardDate, homeLabels as labels } from '../homeLabels'
import { StormDecoration } from './StormDecoration'
import { HomeQuickStart } from './HomeQuickStart'
import { homePrimaryButton, homeSecondaryButton } from './HomeScheduleCards'
import type { RecentWorkoutSessionsLoadState, FeaturedWorkoutPlanLoadState } from '../types/homeView.types'
import { useHomeIntro } from '../useHomeIntro'
import { HomeActionIcon } from './HomeActionIcon'
import { RecentSessionCard } from './RecentSessionCard'

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
  disciplineTag?: string
  introReady?: boolean
}

export function HomeView({ today, featuredPlanLoadState, recentSessionsLoadState, onRetryLoadFeaturedPlan, onRetryLoadRecentSessions,
  primary, overdue, weekPlan, rpeReminder, wellbeing, empty, timerLabel, disciplineTag, introReady = true }: HomeViewProps) {
  const introRef = useHomeIntro(introReady)
  return <div ref={introRef} className="home-view flex-1">
    <div className="home-content mx-auto flex w-full max-w-lg flex-col gap-3.5 px-4 pb-4 pt-14 md:max-w-2xl md:pb-6 md:pt-2">
      <ScreenHeader variant="home" title={labels.heading} />
      {disciplineTag && <p className="home-discipline-tag">{disciplineTag}</p>}
      {empty ? <section aria-label={labels.quickStart} className="storm-card home-main-card">
        <StormDecoration />
        <div className="space-y-3">
          <p className="home-card-date">{homeCardDate(today)}</p>
          <h2 className="home-workout-name">{labels.empty}</h2>
          <p className="home-workout-sub">{labels.emptyHint}</p>
        </div>
        <div className="home-card-actions">
          <span id="home-empty-description" className="sr-only">{labels.emptyHint}</span>
          <Link to={routes.newWorkout} aria-describedby="home-empty-description" className={homePrimaryButton}><HomeActionIcon kind="start" />{labels.createPlan}</Link>
          <Link to={routes.newManualWorkout} state={{ returnTo: routes.home }} className="home-secondary-action"><span className="home-tile-icon"><HomeActionIcon kind="entry" /></span>{labels.firstClub}</Link>
        </div>
      </section> : <>
        {primary ?? <HomeQuickStart today={today} state={featuredPlanLoadState} timerLabel={timerLabel} onRetry={onRetryLoadFeaturedPlan} />}
        {overdue}
        {weekPlan}
        {recentSessionsLoadState.status === 'loading' ? <p role="status" className="text-sm text-muted">{labels.loadingSessions}</p>
          : recentSessionsLoadState.status === 'error' ? <div role="alert" className="space-y-2 border border-bd p-4 text-sm text-muted">
            <p>{recentSessionsLoadState.message}</p><button type="button" onClick={onRetryLoadRecentSessions} className={homeSecondaryButton}>{labels.retry}</button>
          </div> : recentSessionsLoadState.sessions[0] && <RecentSessionCard session={recentSessionsLoadState.sessions[0]} />}
      </>}
      {rpeReminder}
      {wellbeing}
    </div>
  </div>
}

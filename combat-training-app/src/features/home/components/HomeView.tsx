import { ScreenHeader } from '@/components/ScreenHeader'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { routes } from '@/app/routes'
import { homeLabels as labels } from '../homeLabels'
import { StormDecoration } from './StormDecoration'
import { HomeQuickStart } from './HomeQuickStart'
import { homePrimaryButton, homeSecondaryButton } from './HomeScheduleCards'
import type { RecentWorkoutSessionsLoadState, FeaturedWorkoutPlanLoadState } from '../types/homeView.types'
import { useHomeIntro } from '../useHomeIntro'
import { HomeActionIcon } from './HomeActionIcon'
import { RecentSessionCard } from './RecentSessionCard'
import { HomeQuickLinkContent } from './HomeQuickLinkContent'

interface HomeViewProps {
  today: string
  featuredPlanLoadState: FeaturedWorkoutPlanLoadState
  recentSessionsLoadState: RecentWorkoutSessionsLoadState
  onRetryLoadFeaturedPlan: () => void
  onRetryLoadRecentSessions: () => void
  primary?: ReactNode
  todo?: ReactNode
  weekPlan?: ReactNode
  wellbeing?: ReactNode
  empty?: boolean
  introReady?: boolean
}

export function HomeView({ today, featuredPlanLoadState, recentSessionsLoadState, onRetryLoadFeaturedPlan, onRetryLoadRecentSessions,
  primary, todo, weekPlan, wellbeing, empty, introReady = true }: HomeViewProps) {
  const introRef = useHomeIntro(introReady)
  return <div ref={introRef} className="home-view flex-1">
    <div className="home-content mx-auto flex w-full max-w-lg flex-col gap-3.5 px-4 pb-4 pt-14 md:max-w-2xl md:pb-6 md:pt-2">
      <ScreenHeader variant="home" title={labels.heading} />
      {empty ? <>
        <section aria-labelledby="home-empty-heading" className="storm-card home-main-card home-empty-card">
          <StormDecoration dimmed />
          <div className="home-card-meta">
            <p className="home-card-date">{labels.firstStep}</p>
            <span className="home-neutral-badge">{labels.newProfile}</span>
          </div>
          <div>
            <h2 id="home-empty-heading" className="home-workout-name">{labels.empty}</h2>
            <p id="home-empty-description" className="home-workout-sub">{labels.emptyHint}</p>
          </div>
          <div className="home-card-actions">
            <Link to={routes.newWorkout} aria-describedby="home-empty-description" className={homePrimaryButton}><HomeActionIcon kind="plus" /><span>{labels.createPlan}</span></Link>
            <div className="home-action-tiles">
              <Link to={routes.quickTimer} className="home-secondary-action"><span className="home-tile-icon"><HomeActionIcon kind="timer" strokeWidth={2} /></span><span>{labels.timer}</span></Link>
              <Link to={routes.newManualWorkout} state={{ returnTo: routes.home }} className="home-secondary-action"><span className="home-tile-icon"><HomeActionIcon kind="calendar" strokeWidth={2} /></span><span>{labels.clubWorkout}</span></Link>
            </div>
          </div>
        </section>
        <Link to={routes.myExercises} className="quick-link-row-5a">
          <HomeQuickLinkContent icon="book" title={labels.exerciseLibrary} subtitle={labels.exerciseLibraryHint} />
        </Link>
      </> : <>
        {primary ?? <HomeQuickStart today={today} state={featuredPlanLoadState} onRetry={onRetryLoadFeaturedPlan} />}
        {todo}
        {weekPlan}
        {recentSessionsLoadState.status === 'loading' ? <p role="status" className="text-sm text-muted">{labels.loadingSessions}</p>
          : recentSessionsLoadState.status === 'error' ? <div role="alert" className="space-y-2 border border-bd p-4 text-sm text-muted">
            <p>{recentSessionsLoadState.message}</p><button type="button" onClick={onRetryLoadRecentSessions} className={homeSecondaryButton}>{labels.retry}</button>
          </div> : recentSessionsLoadState.sessions[0] && <RecentSessionCard session={recentSessionsLoadState.sessions[0]} />}
      </>}
      {wellbeing}
    </div>
  </div>
}

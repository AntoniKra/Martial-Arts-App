import { Link } from 'react-router-dom'

import { routes } from '@/app/routes'
import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon'
import { getButtonClassName } from '@/components/ui/Button'
import { RedAccent } from '@/components/ui/RedAccent'
import { FeaturedPlanCard } from '@/features/home/components/FeaturedPlanCard'
import { HomeSectionLabel } from '@/features/home/components/HomeSectionLabel'
import { RecentSessionCard } from '@/features/home/components/RecentSessionCard'
import type {
  FeaturedWorkoutPlanLoadState,
  HomeRecentSession,
} from '@/features/home/types/homeView.types'

interface HomeViewProps {
  sessionLabelPl: string
  featuredPlanLoadState: FeaturedWorkoutPlanLoadState
  recentSessions: HomeRecentSession[]
  onRetryLoadFeaturedPlan: () => void
}

function FeaturedPlanLoadingState() {
  return (
    <p
      className="border border-bd bg-surface px-6 py-12 text-center text-[13px] text-muted"
      role="status"
      aria-live="polite"
    >
      Ładowanie planu…
    </p>
  )
}

interface FeaturedPlanErrorStateProps {
  message: string
  onRetry: () => void
}

function FeaturedPlanErrorState({ message, onRetry }: FeaturedPlanErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center border border-bd bg-surface px-6 py-12 text-center"
      role="alert"
    >
      <h2 className="font-display text-[15px] font-semibold text-ink">Nie udało się wczytać planu</h2>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className={getButtonClassName({ variant: 'primary', size: 'md', className: 'mt-5' })}
      >
        Spróbuj ponownie
      </button>
    </div>
  )
}

function FeaturedPlanEmptyState() {
  return (
    <div className="flex flex-col items-center border border-bd bg-surface px-6 py-12 text-center">
      <h2 className="font-display text-[15px] font-semibold text-ink">Nie masz jeszcze zapisanego planu</h2>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
        Utwórz pierwszy plan treningowy, aby rozpocząć pracę nad techniką.
      </p>
      <Link
        to={routes.newWorkout}
        className={getButtonClassName({ variant: 'primary', size: 'md', className: 'mt-5' })}
      >
        Utwórz plan
      </Link>
    </div>
  )
}

export function HomeView({
  sessionLabelPl,
  featuredPlanLoadState,
  recentSessions,
  onRetryLoadFeaturedPlan,
}: HomeViewProps) {
  const isEmptyPlanState =
    featuredPlanLoadState.status === 'success' && featuredPlanLoadState.plan === null

  function renderFeaturedPlanSection() {
    if (featuredPlanLoadState.status === 'loading') {
      return <FeaturedPlanLoadingState />
    }

    if (featuredPlanLoadState.status === 'error') {
      return (
        <FeaturedPlanErrorState
          message={featuredPlanLoadState.message}
          onRetry={onRetryLoadFeaturedPlan}
        />
      )
    }

    if (featuredPlanLoadState.plan === null) {
      return <FeaturedPlanEmptyState />
    }

    return <FeaturedPlanCard plan={featuredPlanLoadState.plan} />
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-lg space-y-6 px-4 pb-4 pt-6 md:max-w-4xl md:pb-6 md:pt-2">
        <header>
          <HomeSectionLabel>{sessionLabelPl}</HomeSectionLabel>
          <h1 className="mt-1 font-display text-[28px] font-bold leading-tight text-ink md:text-[32px]">
            Gotowy do treningu?
          </h1>
          <RedAccent className="mt-3 w-8" />
        </header>

        <div className="space-y-6 md:grid md:grid-cols-2 md:items-start md:gap-8 md:space-y-0">
          <div className="space-y-6">
            {renderFeaturedPlanSection()}

            {isEmptyPlanState ? null : (
              <Link
                to={routes.newWorkout}
                className="flex min-h-touch w-full items-center justify-between border border-bd bg-elevated px-4 py-3 transition-colors hover:border-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
              >
                <span className="font-display text-[13px] font-semibold tracking-[0.04em] text-muted">
                  Utwórz nowy trening
                </span>
                <ChevronRightIcon className="text-muted" />
              </Link>
            )}
          </div>

          {recentSessions.length > 0 ? (
            <section aria-labelledby="home-recent-sessions-heading">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="home-recent-sessions-heading">
                  <HomeSectionLabel>Ostatnie sesje</HomeSectionLabel>
                </h2>
                <Link
                  to={routes.workouts}
                  className="inline-flex min-h-touch items-center px-2 font-display text-[10px] font-semibold uppercase tracking-[0.08em] text-crimson hover:text-crimson-hi focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
                >
                  Zobacz wszystkie
                </Link>
              </div>
              <div className="space-y-2">
                {recentSessions.map((session) => (
                  <RecentSessionCard key={session.id} session={session} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'

import { routes } from '@/app/routes'
import { FeaturedPlanCard } from '@/features/home/components/FeaturedPlanCard'
import { HomeChevronRightIcon } from '@/features/home/components/HomeChevronRightIcon'
import { HomeRedAccent } from '@/features/home/components/HomeRedAccent'
import { HomeSectionLabel } from '@/features/home/components/HomeSectionLabel'
import { RecentSessionCard } from '@/features/home/components/RecentSessionCard'
import type { HomeViewData } from '@/features/home/types/homeView.types'

interface HomeViewProps {
  data: HomeViewData
}

export function HomeView({ data }: HomeViewProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-lg space-y-6 px-4 pb-4 pt-6 md:max-w-4xl md:pb-6 md:pt-2">
        <header>
          <HomeSectionLabel>{data.sessionLabelPl}</HomeSectionLabel>
          <h1 className="mt-1 font-display text-[28px] font-bold leading-tight text-ink md:text-[32px]">
            Gotowy do treningu?
          </h1>
          <HomeRedAccent className="mt-3 w-8" />
        </header>

        <div className="space-y-6 md:grid md:grid-cols-2 md:items-start md:gap-8 md:space-y-0">
          <div className="space-y-6">
            <FeaturedPlanCard plan={data.featuredPlan} />

            <Link
              to={routes.newWorkout}
              className="flex min-h-touch w-full items-center justify-between border border-bd bg-elevated px-4 py-3 transition-colors hover:border-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
            >
              <span className="font-display text-[13px] font-semibold tracking-[0.04em] text-muted">
                Utwórz nowy trening
              </span>
              <HomeChevronRightIcon className="text-muted" />
            </Link>
          </div>

          {data.recentSessions.length > 0 ? (
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
                {data.recentSessions.map((session) => (
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

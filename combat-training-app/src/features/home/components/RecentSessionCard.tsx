import { Link } from 'react-router-dom'

import { routes } from '@/app/routes'
import { HomeDisciplineBadge } from '@/features/home/components/HomeDisciplineBadge'
import type { HomeRecentSession } from '@/features/home/types/homeView.types'

interface RecentSessionCardProps {
  session: HomeRecentSession
}

export function RecentSessionCard({ session }: RecentSessionCardProps) {
  return (
    <Link
      to={routes.workoutReport(session.id)}
      className="block w-full overflow-hidden border border-bd bg-surface text-left transition-colors hover:border-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
    >
      <div className="px-4 py-4">
        <div className="mb-1 flex items-center justify-between">
          <HomeDisciplineBadge disciplineKey={session.disciplineKey} labelPl={session.disciplineLabelPl} />
          <time className="text-[10px] text-muted">{session.dateLabelPl}</time>
        </div>
        <h3 className="mt-1 font-display text-[14px] font-semibold text-ink">{session.name}</h3>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-display text-[11px] text-muted min-[350px]:grid-cols-[repeat(4,auto)] min-[350px]:items-baseline min-[350px]:justify-between min-[350px]:gap-x-2 min-[350px]:gap-y-0">
          <span className="whitespace-nowrap">
            <span className="font-semibold tabular-nums text-ink">{session.durationLabelPl}</span>
          </span>
          <span className="whitespace-nowrap">
            <span className="font-semibold tabular-nums text-ink">{session.completionPercent}%</span> wykonania
          </span>
          {session.rpe !== null ? (
            <span className="whitespace-nowrap">
              RPE <span className="font-semibold tabular-nums text-ink">{session.rpe}</span>
            </span>
          ) : null}
          {session.averageRatingLabel ? (
            <span className="whitespace-nowrap">
              Śr.{' '}
              <span className="font-semibold tabular-nums text-ink">{session.averageRatingLabel}</span>
              <span className="text-muted">/5</span>
            </span>
          ) : null}
        </div>
      </div>
      <div className="h-0.5 bg-elevated" aria-hidden="true">
        <div
          className="h-full bg-crimson transition-all"
          style={{ width: `${session.completionPercent}%` }}
        />
      </div>
    </Link>
  )
}

import { Link } from 'react-router-dom'

import { routes } from '@/app/routes'
import { DisciplineBadge } from '@/components/domain/DisciplineBadge'
import type { WorkoutHistoryListItem } from '@/features/workouts/types/workoutsView.types'

interface WorkoutHistoryCardProps {
  session: WorkoutHistoryListItem
}

export function WorkoutHistoryCard({ session }: WorkoutHistoryCardProps) {
  return (
    <Link
      to={routes.workoutReport(session.id)}
      className="@container block w-full overflow-hidden border border-bd bg-surface text-left transition-colors hover:border-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
    >
      <div className="px-4 py-4">
        <div className="mb-1 flex items-center justify-between">
          <DisciplineBadge disciplineKey={session.disciplineKey} />
          <time className="text-[10px] text-muted">{session.dateLabelPl}</time>
        </div>
        <h3 className="mt-1 font-display text-[14px] font-semibold text-ink">{session.name}</h3>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-display text-[11px] text-muted @min-[400px]:grid-cols-3 @min-[560px]:grid-cols-5 @min-[560px]:items-baseline @min-[560px]:gap-x-2">
          <span className="whitespace-nowrap">
            <span className="font-semibold tabular-nums text-ink">{session.durationLabelPl}</span>
          </span>
          <span className="whitespace-nowrap">
            <span className="font-semibold tabular-nums text-ink">
              {session.completedRounds}/{session.plannedRounds}
            </span>{' '}
            rund
          </span>
          <span className="whitespace-nowrap">
            <span className="font-semibold tabular-nums text-ink">{session.exerciseCompletionPercent}%</span>{' '}
            ćwiczeń
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
          style={{ width: `${session.exerciseCompletionPercent}%` }}
        />
      </div>
    </Link>
  )
}

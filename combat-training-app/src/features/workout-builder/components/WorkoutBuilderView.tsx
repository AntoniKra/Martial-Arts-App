import type { Dispatch } from 'react'
import { Link } from 'react-router-dom'

import { routes } from '@/app/routes'
import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon'
import { RedAccent } from '@/components/ui/RedAccent'
import { WorkoutMetadataForm } from '@/features/workout-builder/components/WorkoutMetadataForm'
import type {
  WorkoutBuilderAction,
  WorkoutBuilderState,
} from '@/features/workout-builder/state/workoutBuilder.types'
import { selectDisplayPlanName } from '@/features/workout-builder/state/workoutBuilder.selectors'

interface WorkoutBuilderViewProps {
  state: WorkoutBuilderState
  dispatch: Dispatch<WorkoutBuilderAction>
}

export function WorkoutBuilderView({ state, dispatch }: WorkoutBuilderViewProps) {
  const displayPlanName = selectDisplayPlanName(state)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg px-4 py-6 md:max-w-2xl md:py-8">
          <Link
            to={routes.workouts}
            className="mb-6 inline-flex min-h-touch items-center gap-1 font-display text-[12px] font-semibold tracking-[0.04em] text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
          >
            <ChevronRightIcon className="rotate-180" />
            Wróć do treningów
          </Link>

          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
            Kreator treningu
          </p>
          <h1 className="mt-2 font-display text-[24px] font-bold text-ink md:text-[28px]">Nowy trening</h1>
          <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-muted">
            Ustal dyscyplinę i podstawowe informacje planu. Bloki, ćwiczenia i przerwy dodasz w kolejnych
            krokach kreatora.
          </p>

          <div className="mt-8">
            <WorkoutMetadataForm state={state} dispatch={dispatch} />
          </div>

          <section aria-labelledby="workout-builder-display-name-heading" className="mt-8">
            <h2
              id="workout-builder-display-name-heading"
              className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint"
            >
              Aktualna nazwa planu
            </h2>
            <p className="mt-2 font-display text-[18px] font-semibold leading-snug text-ink md:text-[20px]">
              {displayPlanName}
            </p>
          </section>

          <RedAccent className="mt-8" />

          <section aria-labelledby="workout-builder-timeline-heading" className="mt-8">
            <h2
              id="workout-builder-timeline-heading"
              className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint"
            >
              Oś treningu
            </h2>
            <p className="mt-3 border border-bd bg-surface px-4 py-4 text-[13px] leading-relaxed text-muted">
              Bloki i ćwiczenia dodasz w kolejnym kroku.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

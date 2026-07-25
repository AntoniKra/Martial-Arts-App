import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { routes } from '@/app/routes'
import { getButtonClassName } from '@/components/ui/Button'
import { RedAccent } from '@/components/ui/RedAccent'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon'
import { WorkoutHistoryCard } from '@/features/workouts/components/WorkoutHistoryCard'
import { WorkoutPlanCard } from '@/features/workouts/components/WorkoutPlanCard'
import { WorkoutsEmptyState } from '@/features/workouts/components/WorkoutsEmptyState'
import { WorkoutsFilters } from '@/features/workouts/components/WorkoutsFilters'
import type { WorkoutsTab, WorkoutsViewData } from '@/features/workouts/types/workoutsView.types'
import {
  DEFAULT_WORKOUTS_FILTERS,
  filterWorkoutHistory,
  filterWorkoutPlans,
} from '@/features/workouts/utils/workoutsFilters'

interface WorkoutsViewProps {
  data: WorkoutsViewData
}

const tabOptions = [
  { label: 'Plany', value: 'plans' as const },
  { label: 'Historia', value: 'history' as const },
] satisfies readonly { label: string; value: WorkoutsTab }[]

export function WorkoutsView({ data }: WorkoutsViewProps) {
  const [tab, setTab] = useState<WorkoutsTab>('plans')
  const [filters, setFilters] = useState(DEFAULT_WORKOUTS_FILTERS)

  const filteredPlans = useMemo(
    () => filterWorkoutPlans(data.plans, filters),
    [data.plans, filters],
  )
  const filteredHistory = useMemo(
    () => filterWorkoutHistory(data.history, filters),
    [data.history, filters],
  )

  const createWorkoutLink = (
    <Link
      to={routes.newWorkout}
      className="flex min-h-touch w-full items-center justify-between border border-bd bg-elevated px-4 py-3 transition-colors hover:border-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
    >
      <span className="font-display text-[13px] font-semibold tracking-[0.04em] text-muted">
        Utwórz nowy trening
      </span>
      <ChevronRightIcon className="text-muted" />
    </Link>
  )

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="mx-auto w-full max-w-lg shrink-0 px-4 pt-6 md:max-w-4xl md:pt-2">
        <h1 className="font-display text-[24px] font-bold text-ink md:text-[28px]">Treningi</h1>
        <div className="mt-4">
          <SegmentedControl
            ariaLabel="Zakładki ekranu treningów"
            options={tabOptions}
            value={tab}
            onChange={setTab}
          />
        </div>
        <RedAccent className="mt-4" />
        <div className="mt-4 pb-4">
          <WorkoutsFilters filters={filters} onChange={setFilters} idPrefix="workouts" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg px-4 pb-4 md:max-w-4xl md:pb-6">
          {tab === 'plans' ? (
            <section aria-labelledby="workouts-plans-heading" className="space-y-3">
              <h2 id="workouts-plans-heading" className="sr-only">
                Plany treningowe
              </h2>
              {data.plans.length > 0 ? createWorkoutLink : null}
              {data.plans.length === 0 ? (
                <WorkoutsEmptyState
                  variant="no-plans"
                  action={
                    <Link
                      to={routes.newWorkout}
                      className={getButtonClassName({ variant: 'primary', size: 'md' })}
                    >
                      Utwórz nowy trening
                    </Link>
                  }
                />
              ) : filteredPlans.length === 0 ? (
                <WorkoutsEmptyState variant="no-results" />
              ) : (
                <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
                  {filteredPlans.map((plan) => (
                    <WorkoutPlanCard key={plan.id} plan={plan} />
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section aria-labelledby="workouts-history-heading" className="space-y-3">
              <h2 id="workouts-history-heading" className="sr-only">
                Historia treningów
              </h2>
              {data.history.length === 0 ? (
                <WorkoutsEmptyState variant="no-history" />
              ) : filteredHistory.length === 0 ? (
                <WorkoutsEmptyState variant="no-results" />
              ) : (
                <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
                  {filteredHistory.map((session) => (
                    <WorkoutHistoryCard key={session.id} session={session} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

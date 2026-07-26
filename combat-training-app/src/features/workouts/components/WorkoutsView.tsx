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
import type {
  WorkoutHistoryLoadState,
  WorkoutHistoryMutationResult,
  WorkoutPlansLoadState,
  WorkoutsTab,
} from '@/features/workouts/types/workoutsView.types'
import {
  DEFAULT_WORKOUTS_FILTERS,
  filterWorkoutHistory,
  filterWorkoutPlans,
} from '@/features/workouts/utils/workoutsFilters'

interface WorkoutsViewProps {
  plansLoadState: WorkoutPlansLoadState
  historyLoadState: WorkoutHistoryLoadState
  onRetryLoadPlans: () => void
  onRetryLoadHistory: () => void
  onHistoryActivated: () => void
  onUpdateSessionNote: (sessionId: string, note: string) => Promise<WorkoutHistoryMutationResult>
  onDeleteSession: (sessionId: string) => Promise<WorkoutHistoryMutationResult>
}

const tabOptions = [
  { label: 'Plany', value: 'plans' as const },
  { label: 'Historia', value: 'history' as const },
] satisfies readonly { label: string; value: WorkoutsTab }[]

function WorkoutPlansLoadingState() {
  return (
    <p className="border border-bd bg-surface px-6 py-12 text-center text-[13px] text-muted" role="status">
      Ładowanie planów…
    </p>
  )
}

interface WorkoutPlansErrorStateProps {
  message: string
  onRetry: () => void
}

function WorkoutPlansErrorState({ message, onRetry }: WorkoutPlansErrorStateProps) {
  return (
    <div className="flex flex-col items-center border border-bd bg-surface px-6 py-12 text-center">
      <h3 className="font-display text-[15px] font-semibold text-ink">Nie udało się wczytać planów</h3>
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

function WorkoutHistoryLoadingState() {
  return (
    <p className="border border-bd bg-surface px-6 py-12 text-center text-[13px] text-muted" role="status">
      Ładowanie historii…
    </p>
  )
}

interface WorkoutHistoryErrorStateProps {
  message: string
  onRetry: () => void
}

function WorkoutHistoryErrorState({ message, onRetry }: WorkoutHistoryErrorStateProps) {
  return (
    <div className="flex flex-col items-center border border-bd bg-surface px-6 py-12 text-center">
      <h3 className="font-display text-[15px] font-semibold text-ink">
        Nie udało się wczytać historii treningów.
      </h3>
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

export function WorkoutsView({
  plansLoadState,
  historyLoadState,
  onRetryLoadPlans,
  onRetryLoadHistory,
  onHistoryActivated,
  onUpdateSessionNote,
  onDeleteSession,
}: WorkoutsViewProps) {
  const [tab, setTab] = useState<WorkoutsTab>('plans')
  const [filters, setFilters] = useState(DEFAULT_WORKOUTS_FILTERS)

  function handleTabChange(nextTab: WorkoutsTab): void {
    if (nextTab === 'history' && tab !== 'history') {
      onHistoryActivated()
    }

    setTab(nextTab)
  }

  const plans = plansLoadState.status === 'success' ? plansLoadState.plans : []
  const history = historyLoadState.status === 'success' ? historyLoadState.sessions : []

  const filteredPlans = useMemo(() => filterWorkoutPlans(plans, filters), [plans, filters])
  const filteredHistory = useMemo(
    () => filterWorkoutHistory(history, filters),
    [history, filters],
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

  function renderPlansContent() {
    if (plansLoadState.status === 'loading') {
      return <WorkoutPlansLoadingState />
    }

    if (plansLoadState.status === 'error') {
      return (
        <WorkoutPlansErrorState message={plansLoadState.message} onRetry={onRetryLoadPlans} />
      )
    }

    if (plans.length === 0) {
      return (
        <WorkoutsEmptyState
          variant="no-plans"
          action={
            <Link
              to={routes.newWorkout}
              className={getButtonClassName({ variant: 'primary', size: 'md' })}
            >
              Utwórz plan
            </Link>
          }
        />
      )
    }

    if (filteredPlans.length === 0) {
      return (
        <>
          {createWorkoutLink}
          <WorkoutsEmptyState variant="no-results" />
        </>
      )
    }

    return (
      <>
        {createWorkoutLink}
        <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
          {filteredPlans.map((plan) => (
            <WorkoutPlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </>
    )
  }

  function renderHistoryContent() {
    if (historyLoadState.status === 'loading') {
      return <WorkoutHistoryLoadingState />
    }

    if (historyLoadState.status === 'error') {
      return (
        <WorkoutHistoryErrorState message={historyLoadState.message} onRetry={onRetryLoadHistory} />
      )
    }

    if (history.length === 0) {
      return <WorkoutsEmptyState variant="no-history" />
    }

    if (filteredHistory.length === 0) {
      return <WorkoutsEmptyState variant="no-results" />
    }

    return (
      <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
        {filteredHistory.map((session) => (
          <WorkoutHistoryCard
            key={session.id}
            session={session}
            onUpdateNote={onUpdateSessionNote}
            onDelete={onDeleteSession}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="mx-auto w-full max-w-lg shrink-0 px-4 pt-6 md:max-w-4xl md:pt-2">
        <h1 className="font-display text-[24px] font-bold text-ink md:text-[28px]">Treningi</h1>
        <div className="mt-4">
          <SegmentedControl
            ariaLabel="Zakładki ekranu treningów"
            options={tabOptions}
            value={tab}
            onChange={handleTabChange}
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
              {renderPlansContent()}
            </section>
          ) : (
            <section aria-labelledby="workouts-history-heading" className="space-y-3">
              <h2 id="workouts-history-heading" className="sr-only">
                Historia treningów
              </h2>
              {renderHistoryContent()}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

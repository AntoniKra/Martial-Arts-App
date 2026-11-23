import { RouteScreenHeader } from '@/components/ScreenHeader'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { routes } from '@/app/routes'
import { homeLabels } from '@/features/home/homeLabels'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { workoutPlanLabels } from '@/features/workouts/workoutPlanLabels'
import { HistoryJournal } from './HistoryJournal'
import { workoutsFilterLabels } from '../workoutsFilterLabels'
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
  hasWorkoutHistoryContentFilter,
} from '@/features/workouts/utils/workoutsFilters'

interface WorkoutsViewProps {
  tab?: WorkoutsTab
  historyWeek?: string | null
  planDeleted?: boolean
  plansSubscreen?: boolean
  plansLoadState: WorkoutPlansLoadState
  historyLoadState: WorkoutHistoryLoadState
  onRetryLoadPlans: () => void
  onRetryLoadHistory: () => void
  onUpdateSessionNote: (sessionId: string, note: string) => Promise<WorkoutHistoryMutationResult>
  onDeleteSession: (sessionId: string) => Promise<WorkoutHistoryMutationResult>
}

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
  tab = 'plans',
  historyWeek = null,
  planDeleted = false,
  plansSubscreen = false,
  plansLoadState,
  historyLoadState,
  onRetryLoadPlans,
  onRetryLoadHistory,
  onUpdateSessionNote,
  onDeleteSession,
}: WorkoutsViewProps) {
  const [filters, setFilters] = useState(DEFAULT_WORKOUTS_FILTERS)

  const plans = useMemo(
    () => (plansLoadState.status === 'success' ? plansLoadState.plans : []),
    [plansLoadState],
  )
  const history = useMemo(
    () => (historyLoadState.status === 'success' ? historyLoadState.sessions : []),
    [historyLoadState],
  )

  const filteredPlans = useMemo(() => filterWorkoutPlans(plans, filters), [plans, filters])
  const filteredHistory = useMemo(
    () => filterWorkoutHistory(history, filters),
    [history, filters],
  )

  const createWorkoutLink = (
    <Link
      to={tab === 'history' ? routes.newManualWorkout : routes.newWorkout}
      state={tab === 'history' ? { returnTo: routes.progressHistory } : undefined}
      aria-label={tab === 'history' ? workoutsFilterLabels.addManual : workoutsFilterLabels.create}
      className="flex size-11 shrink-0 items-center justify-center rounded-[2px] border border-bd bg-surface text-ink hover:border-muted"
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
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
          <WorkoutsEmptyState variant="no-results" />
        </>
      )
    }

    return (
      <>
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

    if (history.length === 0 && historyWeek === null) {
      return <WorkoutsEmptyState variant="no-history" />
    }

    return (
      <HistoryJournal week={historyWeek} history={history} matching={filteredHistory}
        contentFiltered={hasWorkoutHistoryContentFilter(filters)} sortOrder={filters.sortOrder}
        onUpdateNote={onUpdateSessionNote} onDelete={onDeleteSession} />
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="mx-auto w-full max-w-lg shrink-0 px-4 pt-6 md:max-w-4xl md:pt-2">
        {tab === 'plans' && <>
          <RouteScreenHeader title={plansSubscreen ? 'Plany treningowe' : 'Treningi'} fallback={routes.home} />
          <Link to={routes.quickTimer} className="mr-4 inline-flex min-h-touch items-center text-sm font-semibold text-crimson-ink">{homeLabels.timerRounds}</Link>
          <Link to={routes.myExercises} className="inline-flex min-h-touch items-center text-sm font-semibold text-crimson-ink">Moje ćwiczenia</Link>
        </>}
        {planDeleted ? (
          <p role="status" className="mt-3 border border-bd bg-surface px-3 py-3 text-[13px] text-ink">
            {workoutPlanLabels.deleted}
          </p>
        ) : null}
        <div className="mt-3 pb-3">
          <WorkoutsFilters filters={filters} onChange={setFilters} idPrefix="workouts" addAction={createWorkoutLink} history={tab === 'history'} />
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

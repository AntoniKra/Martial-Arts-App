import { RouteScreenHeader, ScreenHeader } from '@/components/ScreenHeader'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { routes } from '@/app/routes'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
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
} from '@/features/workouts/utils/workoutsFilters'

interface WorkoutsViewProps {
  initialTab?: WorkoutsTab
  planDeleted?: boolean
  plansLoadState: WorkoutPlansLoadState
  historyLoadState: WorkoutHistoryLoadState
  onRetryLoadPlans: () => void
  onRetryLoadHistory: () => void
  onHistoryActivated: () => void
  onTabChange?: (tab: WorkoutsTab) => void
  plansSubscreen?: boolean
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
  initialTab = 'plans',
  planDeleted = false,
  plansLoadState,
  historyLoadState,
  onRetryLoadPlans,
  onRetryLoadHistory,
  onHistoryActivated,
  onTabChange,
  plansSubscreen = false,
  onUpdateSessionNote,
  onDeleteSession,
}: WorkoutsViewProps) {
  const [selection, setSelection] = useState({ routeTab: initialTab, tab: initialTab })
  // Select radios immediately while navigation commits, and follow browser back without resetting filters.
  if (selection.routeTab !== initialTab) setSelection({ routeTab: initialTab, tab: initialTab })
  const tab = selection.routeTab === initialTab ? selection.tab : initialTab
  const [filters, setFilters] = useState(DEFAULT_WORKOUTS_FILTERS)

  function handleTabChange(nextTab: WorkoutsTab): void {
    if (nextTab === 'history' && tab !== 'history') {
      onHistoryActivated()
    }

    setSelection({ routeTab: initialTab, tab: nextTab })
    onTabChange?.(nextTab)
  }

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
      state={tab === 'history' ? { returnTo: '/workouts?tab=history' } : undefined}
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

    if (history.length === 0) {
      return <WorkoutsEmptyState variant="no-history" />
    }

    if (filteredHistory.length === 0) {
      return <WorkoutsEmptyState variant="no-results" />
    }

    return (
      <HistoryJournal history={filteredHistory} sortOrder={filters.sortOrder} onUpdateNote={onUpdateSessionNote} onDelete={onDeleteSession} />
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="mx-auto w-full max-w-lg shrink-0 px-4 pt-6 md:max-w-4xl md:pt-2">
        {tab === 'history' || plansSubscreen
          ? <RouteScreenHeader title={tab === 'history' ? 'Historia' : 'Plany treningowe'} fallback={routes.workouts} />
          : <ScreenHeader variant="main" title="Treningi" />}
        <Link to={routes.myExercises} className="inline-flex min-h-touch items-center text-sm font-semibold text-crimson-ink">Moje ćwiczenia</Link>
        {planDeleted ? (
          <p role="status" className="mt-3 border border-bd bg-surface px-3 py-3 text-[13px] text-ink">
            {workoutPlanLabels.deleted}
          </p>
        ) : null}
        <div className="mt-4">
          <SegmentedControl
            ariaLabel="Zakładki ekranu treningów"
            options={tabOptions}
            value={tab}
            onChange={handleTabChange}
          />
        </div>
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

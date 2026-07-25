import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon'
import { DisciplineBadge } from '@/components/domain/DisciplineBadge'
import { getButtonClassName } from '@/components/ui/Button'
import { RedAccent } from '@/components/ui/RedAccent'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { calculateWorkoutPlanSummary } from '@/domain/workout/workoutCalculations'
import type { WorkoutExercise, WorkoutItem, WorkoutPlan } from '@/domain/workout/workout.types'
import type { WorkoutPlanDetailsLoadState } from '@/features/workout-details/types/workoutPlanDetails.types'
import { formatExerciseConfigurationSummary } from '@/features/workout-details/utils/formatExerciseConfiguration'
import { formatEstimatedDuration, formatSecondsAsClock } from '@/features/workout-builder/utils/formatDuration'
import { polishPlural } from '@/features/workout-builder/utils/polishPlural'

interface WorkoutPlanDetailsViewProps {
  loadState: WorkoutPlanDetailsLoadState
  workoutsListPath: string
  newWorkoutPath: string
  onRetry: () => void
}

function BackToWorkoutsLink({ to }: { to: string }) {
  return (
    <Link
      to={to}
      className="mb-6 inline-flex min-h-touch items-center gap-1 font-display text-[12px] font-semibold tracking-[0.04em] text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
    >
      <ChevronRightIcon className="rotate-180" />
      Wróć do planów
    </Link>
  )
}

function StatusPanel({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center border border-bd bg-surface px-6 py-12 text-center">
      {children}
    </div>
  )
}

function WorkoutPlanDetailsLoadingState({ workoutsListPath }: { workoutsListPath: string }) {
  return (
    <StatusPanel>
      <BackToWorkoutsLink to={workoutsListPath} />
      <p
        className="max-w-sm text-[13px] leading-relaxed text-muted"
        role="status"
        aria-live="polite"
      >
        Ładowanie planu…
      </p>
    </StatusPanel>
  )
}

interface WorkoutPlanDetailsErrorStateProps {
  message: string
  workoutsListPath: string
  onRetry: () => void
}

function WorkoutPlanDetailsErrorState({
  message,
  workoutsListPath,
  onRetry,
}: WorkoutPlanDetailsErrorStateProps) {
  return (
    <StatusPanel>
      <BackToWorkoutsLink to={workoutsListPath} />
      <h1 className="font-display text-[15px] font-semibold text-ink">Nie udało się wczytać planu</h1>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className={getButtonClassName({ variant: 'primary', size: 'md', className: 'mt-5' })}
      >
        Spróbuj ponownie
      </button>
    </StatusPanel>
  )
}

interface WorkoutPlanDetailsNotFoundStateProps {
  workoutsListPath: string
  newWorkoutPath: string
}

function WorkoutPlanDetailsNotFoundState({
  workoutsListPath,
  newWorkoutPath,
}: WorkoutPlanDetailsNotFoundStateProps) {
  return (
    <StatusPanel>
      <BackToWorkoutsLink to={workoutsListPath} />
      <h1 className="font-display text-[15px] font-semibold text-ink">Nie znaleziono planu</h1>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
        Ten plan nie istnieje lub został usunięty.
      </p>
      <div className="mt-5 flex flex-col items-center gap-3">
        <Link to={workoutsListPath} className={getButtonClassName({ variant: 'primary', size: 'md' })}>
          Wróć do planów
        </Link>
        <Link to={newWorkoutPath} className={getButtonClassName({ variant: 'secondary', size: 'md' })}>
          Utwórz nowy plan
        </Link>
      </div>
    </StatusPanel>
  )
}

function DetailsExerciseItem({ exercise }: { exercise: WorkoutExercise }) {
  return (
    <li className="border-t border-bd bg-bg/20 px-3 py-3">
      <p className="break-words font-display text-[14px] font-semibold leading-snug text-ink">
        {exercise.exerciseNameSnapshot}
      </p>
      <p className="mt-1 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-crimson">
        Ćwiczenie
      </p>
      <p className="mt-1 break-words font-display text-[12px] tabular-nums text-muted">
        {formatExerciseConfigurationSummary(exercise)}
      </p>
      {exercise.instruction ? (
        <p className="mt-1 break-words text-[12px] leading-relaxed text-muted">{exercise.instruction}</p>
      ) : null}
    </li>
  )
}

function DetailsBreakItem({ breakItem }: { breakItem: Extract<WorkoutItem, { type: 'break' }> }) {
  return (
    <li className="border-t border-bd px-3 py-3">
      <p className="font-display text-[13px] font-semibold text-ink">Przerwa</p>
      <p className="mt-0.5 font-display text-[12px] tabular-nums text-muted">
        {formatSecondsAsClock(breakItem.durationSeconds)}
      </p>
      {breakItem.instruction ? (
        <p className="mt-1 break-words text-[12px] leading-relaxed text-muted">{breakItem.instruction}</p>
      ) : null}
    </li>
  )
}

function WorkoutPlanDetailsSuccessView({
  plan,
  workoutsListPath,
}: {
  plan: WorkoutPlan
  workoutsListPath: string
}) {
  const summary = calculateWorkoutPlanSummary(plan)

  return (
    <>
      <BackToWorkoutsLink to={workoutsListPath} />

      <DisciplineBadge disciplineKey={plan.disciplineKey} className="text-[11px]" />
      <h1 className="mt-3 break-words font-display text-[24px] font-bold text-ink md:text-[28px]">
        {plan.nameSnapshot}
      </h1>

      {plan.mainGoal ? (
        <p className="mt-3 max-w-prose break-words text-[14px] leading-relaxed text-muted">{plan.mainGoal}</p>
      ) : null}

      <RedAccent className="mt-8" />

      <section aria-labelledby="workout-details-summary-heading" className="mt-8">
        <h2
          id="workout-details-summary-heading"
          className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint"
        >
          Podsumowanie
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          <span className="tabular-nums">{summary.blockCount}</span>{' '}
          {polishPlural(summary.blockCount, 'blok', 'bloki', 'bloków')}
          {' · '}
          <span className="tabular-nums">{summary.exerciseCount}</span>{' '}
          {polishPlural(summary.exerciseCount, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}
          {' · '}
          <span className="tabular-nums">{summary.plannedRoundCount}</span>{' '}
          {polishPlural(summary.plannedRoundCount, 'runda', 'rundy', 'rund')}
          {' · '}
          ok. <span className="tabular-nums">{formatEstimatedDuration(summary.estimatedTotalSeconds)}</span>
        </p>
      </section>

      <section aria-labelledby="workout-details-blocks-heading" className="mt-8 space-y-4">
        <h2
          id="workout-details-blocks-heading"
          className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint"
        >
          Oś treningu
        </h2>

        <ol className="space-y-4" aria-label="Bloki treningu">
          {plan.blocks.map((block, blockIndex) => {
            const blockLabel = getWorkoutBlockLabelPl(block.blockType)
            const itemCount = block.items.length

            return (
              <li key={block.id} className="border border-bd bg-surface">
                <div className="border-b border-bd px-3 py-3">
                  <h3 className="font-display text-[14px] font-semibold text-ink">
                    Blok {blockIndex + 1} · {blockLabel}
                  </h3>
                  <p className="mt-1 text-[12px] text-muted">
                    <span className="tabular-nums">{itemCount}</span>{' '}
                    {polishPlural(itemCount, 'element', 'elementy', 'elementów')}
                  </p>
                </div>

                {itemCount === 0 ? (
                  <p className="px-3 py-4 text-[13px] text-muted">Brak elementów w bloku.</p>
                ) : (
                  <ol className="divide-y divide-bd" aria-label={`Elementy bloku ${blockIndex + 1}`}>
                    {block.items.map((item) =>
                      item.type === 'exercise' ? (
                        <DetailsExerciseItem key={item.id} exercise={item} />
                      ) : (
                        <DetailsBreakItem key={item.id} breakItem={item} />
                      ),
                    )}
                  </ol>
                )}
              </li>
            )
          })}
        </ol>
      </section>
    </>
  )
}

export function WorkoutPlanDetailsView({
  loadState,
  workoutsListPath,
  newWorkoutPath,
  onRetry,
}: WorkoutPlanDetailsViewProps) {
  function renderContent() {
    if (loadState.status === 'loading') {
      return <WorkoutPlanDetailsLoadingState workoutsListPath={workoutsListPath} />
    }

    if (loadState.status === 'error') {
      return (
        <WorkoutPlanDetailsErrorState
          message={loadState.message}
          workoutsListPath={workoutsListPath}
          onRetry={onRetry}
        />
      )
    }

    if (loadState.status === 'notFound') {
      return (
        <WorkoutPlanDetailsNotFoundState
          workoutsListPath={workoutsListPath}
          newWorkoutPath={newWorkoutPath}
        />
      )
    }

    return <WorkoutPlanDetailsSuccessView plan={loadState.plan} workoutsListPath={workoutsListPath} />
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg px-4 py-6 md:max-w-2xl md:py-8">{renderContent()}</div>
      </div>
    </div>
  )
}

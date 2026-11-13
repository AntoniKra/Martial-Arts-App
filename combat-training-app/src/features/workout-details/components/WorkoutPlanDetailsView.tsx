import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon'
import { DisciplineBadge } from '@/components/domain/DisciplineBadge'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { calculateWorkoutPlanSummary } from '@/domain/workout/workoutCalculations'
import type { WorkoutExercise, WorkoutItem, WorkoutPlan } from '@/domain/workout/workout.types'
import type { WorkoutPlanDetailsLoadState } from '@/features/workout-details/types/workoutPlanDetails.types'
import { formatExerciseConfigurationSummary } from '@/features/workout-details/utils/formatExerciseConfiguration'
import { formatEstimatedDuration, formatSecondsAsClock } from '@/domain/time/formatDuration'
import { polishPlural } from '@/domain/language/polishPlural'
import { WorkoutPlanActions } from '@/features/workout-details/components/WorkoutPlanActions'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { WORKOUT_PREPARATION_OPTIONS } from '@/features/workout-player/workoutPreparation'
import { workoutPlayerLabels } from '@/features/workout-player/workoutPlayerLabels'
import { persistWorkoutPreparation, readStoredWorkoutPreparation } from '@/infrastructure/storage/workoutPreparationStorage'
import { persistWorkoutEndWarning, readStoredWorkoutEndWarning } from '@/infrastructure/storage/workoutEndWarningStorage'
import { countFocusExercises } from '@/domain/focus-skill/focusSkillSelectors'
import { FocusSkillBadge } from '@/features/focus-skills/FocusSkillBadge'
import { focusSkillLabels } from '@/features/focus-skills/focusSkillLabels'

interface WorkoutPlanDetailsViewProps {
  correctionNotes?: ReactNode
  loadState: WorkoutPlanDetailsLoadState
  workoutsListPath: string
  newWorkoutPath: string
  workoutActivePath: string
  workoutEditPath: string
  onDelete: () => Promise<void>
  onRetry: () => void
}

function BackToWorkoutsLink({ to }: { to: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-touch w-full items-center gap-1 font-display text-[12px] font-semibold tracking-[0.04em] text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
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

export function WorkoutPlanDetailsNotFoundState({
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
      <p className="flex items-start justify-between gap-3 font-display text-[14px] font-semibold leading-snug text-ink">
        <span className="min-w-0 break-words">{exercise.exerciseNameSnapshot}</span>
        {exercise.focusSkillId !== null && <FocusSkillBadge />}
      </p>
      <p className="mt-1 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-crimson-ink">
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
  correctionNotes,
  plan,
  workoutsListPath,
  workoutActivePath,
  workoutEditPath,
  onDelete,
}: {
  correctionNotes?: ReactNode
  plan: WorkoutPlan
  workoutsListPath: string
  workoutActivePath: string
  workoutEditPath: string
  onDelete: () => Promise<void>
}) {
  const summary = calculateWorkoutPlanSummary(plan)
  const focusExerciseCount = countFocusExercises(plan.blocks)
  const [preparation, setPreparation] = useState(readStoredWorkoutPreparation)
  const [endWarningEnabled, setEndWarningEnabled] = useState(readStoredWorkoutEndWarning)

  return (
    <div className="flex flex-col items-start gap-3">
      <BackToWorkoutsLink to={workoutsListPath} />

      <DisciplineBadge disciplineKey={plan.disciplineKey} className="text-[11px]" />

      <h1 className="break-words font-display text-[24px] font-bold text-ink md:text-[28px]">
        {plan.nameSnapshot}
      </h1>
      <p className="text-[13px] text-muted">{focusSkillLabels.planCount(focusExerciseCount)}</p>

      {plan.mainGoal ? (
        <p className="max-w-prose break-words text-[14px] leading-relaxed text-muted">{plan.mainGoal}</p>
      ) : null}

      <section aria-labelledby="workout-details-summary-heading" className="w-full">
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

      <SegmentedControl
        label={workoutPlayerLabels.preparationSetting}
        options={WORKOUT_PREPARATION_OPTIONS}
        value={preparation}
        onChange={(value) => setPreparation(persistWorkoutPreparation(value))}
        className="w-full"
      />

      <label className="flex min-h-touch w-full cursor-pointer items-center gap-3 text-[13px] leading-relaxed text-ink">
        <input
          type="checkbox"
          role="switch"
          checked={endWarningEnabled}
          onChange={(event) => setEndWarningEnabled(persistWorkoutEndWarning(event.target.checked))}
          className="h-5 w-5 shrink-0 accent-crimson focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
        />
        <span>{workoutPlayerLabels.endWarningSetting}</span>
      </label>

      <Link
        to={workoutActivePath}
        className={getButtonClassName({
          variant: 'primary',
          size: 'lg',
          className: 'w-full uppercase tracking-[0.1em]',
        })}
      >
        Rozpocznij trening
      </Link>

      <WorkoutPlanActions key={plan.id} editPath={workoutEditPath} onDelete={onDelete} />

      {correctionNotes}

      <section aria-labelledby="workout-details-blocks-heading" className="w-full space-y-4">
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
    </div>
  )
}

export function WorkoutPlanDetailsView({
  correctionNotes,
  loadState,
  workoutsListPath,
  newWorkoutPath,
  workoutActivePath,
  workoutEditPath,
  onDelete,
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

    return (
      <WorkoutPlanDetailsSuccessView
        correctionNotes={correctionNotes}
        plan={loadState.plan}
        workoutsListPath={workoutsListPath}
        workoutActivePath={workoutActivePath}
        workoutEditPath={workoutEditPath}
        onDelete={onDelete}
      />
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg px-4 py-6 md:max-w-2xl md:py-8">{renderContent()}</div>
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { RouteScreenHeader } from '@/components/ScreenHeader'
import { BackIcon } from '@/components/ui/BackButton'
import { DisciplineBadge } from '@/components/domain/DisciplineBadge'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { calculateWorkoutPlanSummary } from '@/domain/workout/workoutCalculations'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import type { WorkoutPlanDetailsLoadState } from '@/features/workout-details/types/workoutPlanDetails.types'
import { formatEstimatedDuration } from '@/domain/time/formatDuration'
import { polishPlural } from '@/domain/language/polishPlural'
import { WorkoutPlanActions } from '@/features/workout-details/components/WorkoutPlanActions'
import { routes } from '@/app/routes'
import { profileSettingsLabels } from '@/features/profile/profileSettingsLabels'
import { countFocusExercises } from '@/domain/focus-skill/focusSkillSelectors'
import { focusSkillLabels } from '@/features/focus-skills/focusSkillLabels'
import { workoutPlanLabels } from '@/features/workouts/workoutPlanLabels'
import { ReadOnlyWorkoutTimeline } from '@/features/workout-builder/components/ReadOnlyWorkoutTimeline'
import { workoutBuilderLabels } from '@/features/workout-builder/workoutBuilderLabels'

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
      <RouteScreenHeader title="Ładowanie planu" fallback={workoutsListPath} />
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
      <RouteScreenHeader title="Nie udało się wczytać planu" fallback={workoutsListPath} />
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
      <RouteScreenHeader title="Nie znaleziono planu" fallback={workoutsListPath} />
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
        Ten plan nie istnieje lub został usunięty.
      </p>
      <div className="mt-5 flex flex-col items-center gap-3">
        <Link to={workoutsListPath} className={getButtonClassName({ variant: 'primary', size: 'md' })}>
          <BackIcon size={16} />{workoutPlanLabels.backToPlans}
        </Link>
        <Link to={newWorkoutPath} className={getButtonClassName({ variant: 'secondary', size: 'md' })}>
          Utwórz nowy plan
        </Link>
      </div>
    </StatusPanel>
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

  return (
    <div className="flex flex-col items-start gap-3">
      <RouteScreenHeader title={plan.nameSnapshot} fallback={workoutsListPath} />
      <DisciplineBadge disciplineKey={plan.disciplineKey} className="text-[11px]" />
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

      <Link to={`${routes.profile}#profile-training`} className="inline-flex min-h-touch items-center text-sm text-muted">{profileSettingsLabels.trainingLink}</Link>

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

      <section aria-labelledby="workout-details-blocks-heading" className="w-full space-y-3">
        <h2
          id="workout-details-blocks-heading"
          className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint"
        >
          {workoutBuilderLabels.timelineHeading}
        </h2>
        <ReadOnlyWorkoutTimeline blocks={plan.blocks} />
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

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon'
import { DisciplineBadge } from '@/components/domain/DisciplineBadge'
import { getButtonClassName } from '@/components/ui/Button'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import { useWorkoutPlayback } from '@/features/workout-player/hooks/useWorkoutPlayback'
import type {
  WorkoutPlaybackStep,
  WorkoutPlaybackStepKind,
  WorkoutPlaybackTimeline,
  WorkoutPlayerLoadState,
} from '@/features/workout-player/types/workoutPlayback.types'
import { createWorkoutPlaybackTimeline } from '@/features/workout-player/utils/createWorkoutPlaybackTimeline'
import { formatSecondsAsClock } from '@/features/workout-builder/utils/formatDuration'

interface WorkoutPlayerViewProps {
  loadState: WorkoutPlayerLoadState
  workoutsListPath: string
  workoutDetailsPath: string
  onRetry: () => void
}

function BackToWorkoutsLink({ to }: { to: string }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-touch items-center gap-1 font-display text-[12px] font-semibold tracking-[0.04em] text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
    >
      <ChevronRightIcon className="rotate-180" />
      Wróć do planów
    </Link>
  )
}

function BackToPlanLink({ to }: { to: string }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-touch items-center gap-1 font-display text-[12px] font-semibold tracking-[0.04em] text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
    >
      <ChevronRightIcon className="rotate-180" />
      Wróć do planu
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

function WorkoutPlayerLoadingState({ workoutsListPath }: { workoutsListPath: string }) {
  return (
    <StatusPanel>
      <BackToWorkoutsLink to={workoutsListPath} />
      <h1 className="font-display text-[15px] font-semibold text-ink">Ładowanie treningu</h1>
      <p
        className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted"
        role="status"
        aria-live="polite"
      >
        Ładowanie treningu…
      </p>
    </StatusPanel>
  )
}

interface WorkoutPlayerErrorStateProps {
  message: string
  workoutsListPath: string
  onRetry: () => void
}

function WorkoutPlayerErrorState({ message, workoutsListPath, onRetry }: WorkoutPlayerErrorStateProps) {
  return (
    <StatusPanel>
      <BackToWorkoutsLink to={workoutsListPath} />
      <h1 className="font-display text-[15px] font-semibold text-ink">Nie udało się wczytać treningu</h1>
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

function WorkoutPlayerNotFoundState({ workoutsListPath }: { workoutsListPath: string }) {
  return (
    <StatusPanel>
      <BackToWorkoutsLink to={workoutsListPath} />
      <h1 className="font-display text-[15px] font-semibold text-ink">Nie znaleziono planu</h1>
      <Link to={workoutsListPath} className={getButtonClassName({ variant: 'primary', size: 'md', className: 'mt-5' })}>
        Wróć do planów
      </Link>
    </StatusPanel>
  )
}

function getStepKindLabelPl(kind: WorkoutPlaybackStepKind): string {
  switch (kind) {
    case 'exercise':
      return 'Ćwiczenie'
    case 'roundRest':
      return 'Przerwa między rundami'
    case 'break':
      return 'Przerwa'
  }
}

function buildStepAnnouncement(step: WorkoutPlaybackStep, stepIndex: number, totalSteps: number): string {
  const blockLabel = getWorkoutBlockLabelPl(step.blockType)
  const kindLabel = getStepKindLabelPl(step.kind)
  const roundLabel =
    step.roundNumber !== null && step.roundCount !== null
      ? ` Runda ${step.roundNumber} z ${step.roundCount}.`
      : ''

  return `Etap ${stepIndex + 1} z ${totalSteps}. Blok ${step.blockIndex + 1}, ${blockLabel}. ${kindLabel}. ${step.name}.${roundLabel}`
}

interface WorkoutPlayerActiveContentProps {
  plan: WorkoutPlan
  workoutDetailsPath: string
}

interface WorkoutPlayerRuntimeProps {
  plan: WorkoutPlan
  timeline: WorkoutPlaybackTimeline
  workoutDetailsPath: string
}

function WorkoutPlayerRuntime({ plan, timeline, workoutDetailsPath }: WorkoutPlayerRuntimeProps) {
  const {
    playback,
    currentStep,
    canGoPrevious,
    canGoNext,
    progressRatio,
    start,
    pause,
    resume,
    goToPreviousStep,
    goToNextStep,
    restart,
  } = useWorkoutPlayback(timeline)

  const [stepAnnouncement, setStepAnnouncement] = useState('')

  useEffect(() => {
    if (!currentStep || playback.status === 'idle' || playback.status === 'completed') {
      return
    }

    setStepAnnouncement(buildStepAnnouncement(currentStep, playback.currentStepIndex, timeline.steps.length))
  }, [currentStep, playback.currentStepIndex, playback.status, timeline.steps.length])

  const totalSteps = timeline.steps.length
  const isCompleted = playback.status === 'completed'

  function renderPrimaryAction() {
    if (isCompleted) {
      return null
    }

    if (playback.status === 'idle') {
      return (
        <button
          type="button"
          onClick={start}
          className={getButtonClassName({ variant: 'primary', size: 'lg', className: 'w-full uppercase tracking-[0.08em]' })}
        >
          Rozpocznij trening
        </button>
      )
    }

    if (playback.status === 'running') {
      return (
        <button
          type="button"
          onClick={pause}
          className={getButtonClassName({ variant: 'primary', size: 'lg', className: 'w-full uppercase tracking-[0.08em]' })}
        >
          Pauza
        </button>
      )
    }

    return (
      <button
        type="button"
        onClick={resume}
        className={getButtonClassName({ variant: 'primary', size: 'lg', className: 'w-full uppercase tracking-[0.08em]' })}
      >
        Wznów
      </button>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <div className="h-1 w-full bg-elevated" aria-hidden="true">
        <div
          className="h-full bg-crimson transition-[width] duration-300"
          style={{ width: `${Math.min(progressRatio, 1) * 100}%` }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6 md:max-w-2xl md:py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <BackToPlanLink to={workoutDetailsPath} />
          {playback.status === 'paused' ? (
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Wstrzymany</p>
          ) : null}
        </div>

        {isCompleted ? (
          <h1 className="font-display text-[24px] font-bold text-ink md:text-[28px]">Trening zakończony</h1>
        ) : (
          <>
            <DisciplineBadge disciplineKey={plan.disciplineKey} className="text-[11px]" />
            <h1 className="mt-3 break-words font-display text-[24px] font-bold text-ink md:text-[28px]">
              {plan.nameSnapshot}
            </h1>
          </>
        )}

        {!isCompleted && currentStep ? (
          <>
            <p className="mt-4 font-display text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
              Etap <span className="tabular-nums">{playback.currentStepIndex + 1}</span> z{' '}
              <span className="tabular-nums">{totalSteps}</span>
            </p>

            <p className="mt-2 break-words font-display text-[14px] font-semibold text-ink">
              Blok <span className="tabular-nums">{currentStep.blockIndex + 1}</span> ·{' '}
              {getWorkoutBlockLabelPl(currentStep.blockType)}
            </p>

            <p className="mt-1 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-crimson">
              {getStepKindLabelPl(currentStep.kind)}
            </p>

            <p className="mt-2 break-words font-display text-[18px] font-bold leading-snug text-ink">
              {currentStep.name}
            </p>

            {currentStep.roundNumber !== null && currentStep.roundCount !== null ? (
              <p className="mt-1 font-display text-[13px] tabular-nums text-muted">
                Runda {currentStep.roundNumber} z {currentStep.roundCount}
              </p>
            ) : null}

            {currentStep.instruction ? (
              <p className="mt-3 break-words text-[13px] leading-relaxed text-muted">{currentStep.instruction}</p>
            ) : null}

            <p
              className="mt-8 font-display text-[56px] font-bold tabular-nums leading-none text-ink sm:text-[64px]"
              aria-hidden="true"
            >
              {formatSecondsAsClock(playback.remainingSeconds)}
            </p>

            <p className="sr-only">
              Pozostały czas: {formatSecondsAsClock(playback.remainingSeconds)}
            </p>
          </>
        ) : null}

        {isCompleted ? (
          <p className="mt-3 max-w-prose text-[14px] leading-relaxed text-muted">
            Trening został ukończony. Postęp nie został zapisany.
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-3">
          {renderPrimaryAction()}

          {!isCompleted ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  goToPreviousStep({
                    expectedStepIndex: playback.currentStepIndex,
                    expectedStepRevision: playback.stepRevision,
                  })
                }
                disabled={!canGoPrevious}
                className={getButtonClassName({
                  variant: 'secondary',
                  size: 'md',
                  className: 'w-full uppercase tracking-[0.06em]',
                  disabled: !canGoPrevious,
                })}
              >
                Poprzedni
              </button>
              <button
                type="button"
                onClick={() =>
                  goToNextStep({
                    expectedStepIndex: playback.currentStepIndex,
                    expectedStepRevision: playback.stepRevision,
                  })
                }
                disabled={!canGoNext}
                className={getButtonClassName({
                  variant: 'secondary',
                  size: 'md',
                  className: 'w-full uppercase tracking-[0.06em]',
                  disabled: !canGoNext,
                })}
              >
                Następny
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={restart}
                className={getButtonClassName({
                  variant: 'primary',
                  size: 'lg',
                  className: 'w-full uppercase tracking-[0.08em]',
                })}
              >
                Uruchom ponownie
              </button>
              <Link
                to={workoutDetailsPath}
                className={getButtonClassName({
                  variant: 'secondary',
                  size: 'md',
                  className: 'w-full uppercase tracking-[0.06em]',
                })}
              >
                Wróć do planu
              </Link>
            </div>
          )}
        </div>

        <p className="sr-only" aria-live="polite">{stepAnnouncement}</p>
      </div>
    </div>
  )
}

function WorkoutPlayerActiveContent({ plan, workoutDetailsPath }: WorkoutPlayerActiveContentProps) {
  const timeline = useMemo(() => createWorkoutPlaybackTimeline(plan), [plan])

  return (
    <WorkoutPlayerRuntime
      key={timeline.identity}
      plan={plan}
      timeline={timeline}
      workoutDetailsPath={workoutDetailsPath}
    />
  )
}

export function WorkoutPlayerView({
  loadState,
  workoutsListPath,
  workoutDetailsPath,
  onRetry,
}: WorkoutPlayerViewProps) {
  function renderContent() {
    if (loadState.status === 'loading') {
      return <WorkoutPlayerLoadingState workoutsListPath={workoutsListPath} />
    }

    if (loadState.status === 'error') {
      return (
        <WorkoutPlayerErrorState
          message={loadState.message}
          workoutsListPath={workoutsListPath}
          onRetry={onRetry}
        />
      )
    }

    if (loadState.status === 'notFound') {
      return <WorkoutPlayerNotFoundState workoutsListPath={workoutsListPath} />
    }

    return <WorkoutPlayerActiveContent plan={loadState.plan} workoutDetailsPath={workoutDetailsPath} />
  }

  if (loadState.status === 'success') {
    return renderContent()
  }

  return (
    <section className="flex min-h-dvh flex-col bg-bg">
      <div className="mx-auto w-full max-w-lg px-4 py-6 md:max-w-2xl md:py-8">{renderContent()}</div>
    </section>
  )
}

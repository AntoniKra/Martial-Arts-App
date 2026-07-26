import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon'
import { DisciplineBadge } from '@/components/domain/DisciplineBadge'
import { getButtonClassName } from '@/components/ui/Button'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import { WorkoutCircularTimer } from '@/features/workout-player/components/WorkoutCircularTimer'
import { WorkoutPlayerControls } from '@/features/workout-player/components/WorkoutPlayerControls'
import { WorkoutPlayerNextPreview } from '@/features/workout-player/components/WorkoutPlayerNextPreview'
import { useWorkoutPlayback } from '@/features/workout-player/hooks/useWorkoutPlayback'
import type {
  WorkoutPlaybackStep,
  WorkoutPlaybackStepKind,
  WorkoutPlaybackTimeline,
  WorkoutPlayerLoadState,
} from '@/features/workout-player/types/workoutPlayback.types'
import { createWorkoutPlaybackTimeline } from '@/features/workout-player/utils/createWorkoutPlaybackTimeline'
import { getWorkoutStepKindShortLabelPl } from '@/features/workout-player/utils/workoutStepTimerPresentation'

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
  return getWorkoutStepKindShortLabelPl(kind)
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

function WorkoutPlayerCompletedPanel({
  planName,
  workoutDetailsPath,
  onRestart,
}: {
  planName: string
  workoutDetailsPath: string
  onRestart: () => void
}) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 safe-area-pt pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
      <div className="shrink-0 border-b border-bd bg-surface px-4 py-3">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-crimson">
          Trening ukończony
        </p>
        <h1 className="mt-0.5 font-display text-[20px] font-bold text-ink">Trening zakończony</h1>
      </div>

      <div className="flex flex-1 flex-col px-1 pt-5">
        <p className="font-display text-[15px] font-semibold text-ink">{planName}</p>
        <p className="mt-3 max-w-prose text-[14px] leading-relaxed text-muted">
          Trening został ukończony. Postęp nie został zapisany.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={onRestart}
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
      </div>
    </div>
  )
}

function WorkoutPlayerRuntime({ plan, timeline, workoutDetailsPath }: WorkoutPlayerRuntimeProps) {
  const {
    playback,
    currentStep,
    canGoPrevious,
    canGoNext,
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
  const isPaused = playback.status === 'paused'
  const nextStep = timeline.steps[playback.currentStepIndex + 1] ?? null
  const isLastStep = playback.currentStepIndex >= totalSteps - 1

  if (isCompleted) {
    return (
      <div className="flex min-h-dvh flex-col overflow-hidden bg-bg">
        <WorkoutPlayerCompletedPanel
          planName={plan.nameSnapshot}
          workoutDetailsPath={workoutDetailsPath}
          onRestart={restart}
        />
      </div>
    )
  }

  if (!currentStep) {
    return null
  }

  const stepDurationSeconds = currentStep.durationSeconds

  return (
    <div className="flex min-h-dvh flex-col overflow-hidden bg-bg">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col safe-area-pt">
        <header className="shrink-0 px-5 pt-5 pb-2">
          <div className="flex items-start justify-between gap-4">
            <BackToPlanLink to={workoutDetailsPath} />
            <p className="shrink-0 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Etap <span className="tabular-nums">{playback.currentStepIndex + 1}</span> z{' '}
              <span className="tabular-nums">{totalSteps}</span>
            </p>
          </div>

          <div className="mt-3 flex flex-col items-start gap-1">
            <DisciplineBadge disciplineKey={plan.disciplineKey} />
            <p className="break-words font-display text-[14px] font-semibold leading-snug text-ink">
              {plan.nameSnapshot}
            </p>
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-crimson">
              Blok <span className="tabular-nums">{currentStep.blockIndex + 1}</span> ·{' '}
              {getWorkoutBlockLabelPl(currentStep.blockType)}
            </p>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="shrink-0 px-5 py-3 text-center">
            <h1 className="break-words font-display text-[18px] font-bold leading-snug text-ink">
              {currentStep.name}
            </h1>
            {currentStep.kind === 'exercise' &&
            currentStep.roundNumber !== null &&
            currentStep.roundCount !== null ? (
              <p className="mt-1 font-display text-[11px] uppercase tracking-[0.12em] text-muted">
                Runda {currentStep.roundNumber} z {currentStep.roundCount}
              </p>
            ) : null}
            {currentStep.instruction ? (
              <p className="mt-3 break-words text-[12px] leading-relaxed text-muted">{currentStep.instruction}</p>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-5 py-2">
            <WorkoutCircularTimer
              key={`${currentStep.id}:${playback.stepRevision}`}
              totalSeconds={stepDurationSeconds}
              remainingSeconds={playback.remainingSeconds}
              stepKind={currentStep.kind}
              paused={isPaused}
            />
          </div>

          <WorkoutPlayerNextPreview nextStep={nextStep} isLastStep={isLastStep} />
        </div>

        <WorkoutPlayerControls
          status={playback.status}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          onStart={start}
          onPause={pause}
          onResume={resume}
          onPrevious={() =>
            goToPreviousStep({
              expectedStepIndex: playback.currentStepIndex,
              expectedStepRevision: playback.stepRevision,
            })
          }
          onNext={() =>
            goToNextStep({
              expectedStepIndex: playback.currentStepIndex,
              expectedStepRevision: playback.stepRevision,
            })
          }
        />

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
      <div className="mx-auto w-full max-w-lg px-4 py-6 md:py-8">{renderContent()}</div>
    </section>
  )
}

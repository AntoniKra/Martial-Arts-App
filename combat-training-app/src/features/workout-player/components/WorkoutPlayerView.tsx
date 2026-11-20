import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ActiveWorkout, ActiveWorkoutRepository } from '@/application/workout/activeWorkoutRepository'
import { useActiveWorkoutPersistence } from '../hooks/useActiveWorkoutPersistence'
import { Link } from 'react-router-dom'

import { LiveScreenHeader, RouteScreenHeader } from '@/components/ScreenHeader'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { WorkoutCircularTimer } from '@/features/workout-player/components/WorkoutCircularTimer'
import { WorkoutPlayerControls } from '@/features/workout-player/components/WorkoutPlayerControls'
import { WorkoutPlayerNextPreview } from '@/features/workout-player/components/WorkoutPlayerNextPreview'
import { WorkoutPlayerExitControls } from '@/features/workout-player/components/WorkoutPlayerExitControls'
import { workoutPlayerLabels } from '@/features/workout-player/workoutPlayerLabels'
import { useWorkoutSessionAutoSave, type WorkoutSessionSaveState } from '@/features/workout-player/hooks/useWorkoutSessionAutoSave'
import { useWorkoutSessionRecorder, WORKOUT_SESSION_NO_WORK_MESSAGE, WORKOUT_SESSION_RECORDER_ERROR_MESSAGE } from '@/features/workout-player/hooks/useWorkoutSessionRecorder'
import { useWorkoutPlayback } from '@/features/workout-player/hooks/useWorkoutPlayback'
import { useWorkoutGong } from '@/features/workout-player/hooks/useWorkoutGong'
import { useWorkoutScreenWakeLock } from '@/features/workout-player/hooks/useWorkoutScreenWakeLock'
import type { WorkoutPlaybackEvent } from '@/features/workout-player/types/workoutPlaybackEvents.types'
import type { WorkoutPlaybackStep, WorkoutPlaybackTimeline } from '@/domain/workout-playback/workoutPlayback.types'
import type { WorkoutPlayerLoadState } from '@/features/workout-player/types/workoutPlayback.types'
import { createWorkoutPlaybackTimeline } from '@/domain/workout-playback/createWorkoutPlaybackTimeline'
import { getWorkoutStepKindShortLabelPl, getWorkoutTimerPhase } from '@/features/workout-player/utils/workoutStepTimerPresentation'
import { readStoredWorkoutPreparation } from '@/infrastructure/storage/workoutPreparationStorage'
import { quickTimerLabels } from '@/features/quick-timer/quickTimerLabels'
import { readStoredWorkoutEndWarnings } from '@/infrastructure/storage/workoutEndWarningStorage'
import { countRemainingExerciseRounds } from '@/features/workout-player/utils/countRemainingExerciseRounds'
import './workoutPlayer.css'

interface WorkoutSummaryOptions {
  source?: 'plan' | 'quickTimer'
  focusSkills?: readonly FocusSkill[]
  focusSkillsUnavailable?: boolean
  onSessionSaved?: (sessionId: string) => void
}

interface WorkoutPlayerViewProps extends WorkoutSummaryOptions {
  initialWorkout?: ActiveWorkout
  activeWorkoutRepository?: ActiveWorkoutRepository
  loadState: WorkoutPlayerLoadState
  workoutsListPath: string
  workoutDetailsPath: string
  onRetry: () => void
  saveWorkoutSession: (session: WorkoutSession) => Promise<void>
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
      <RouteScreenHeader title="Ładowanie treningu" fallback={workoutsListPath} />
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
      <RouteScreenHeader title="Nie udało się wczytać treningu" fallback={workoutsListPath} />
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
      <RouteScreenHeader title="Nie znaleziono planu" fallback={workoutsListPath} />
      <Link to={workoutsListPath} className={getButtonClassName({ variant: 'primary', size: 'md', className: 'mt-5' })}>
        Wróć do planów
      </Link>
    </StatusPanel>
  )
}

function buildStepAnnouncement(step: WorkoutPlaybackStep, stepIndex: number, totalSteps: number): string {
  const blockLabel = getWorkoutBlockLabelPl(step.blockType)
  const kindLabel = getWorkoutStepKindShortLabelPl(step.kind)
  const roundLabel =
    step.roundNumber !== null && step.roundCount !== null
      ? ` ${workoutPlayerLabels.round(step.roundNumber, step.roundCount)}.`
      : ''

  return `${workoutPlayerLabels.step(stepIndex + 1, totalSteps)}. ${workoutPlayerLabels.block(step.blockIndex + 1, blockLabel)}. ${kindLabel}. ${step.name}.${roundLabel}`
}

interface WorkoutPlayerActiveContentProps extends WorkoutSummaryOptions {
  initialWorkout?: ActiveWorkout
  activeWorkoutRepository?: ActiveWorkoutRepository
  plan: WorkoutPlan
  workoutDetailsPath: string
  saveWorkoutSession: (session: WorkoutSession) => Promise<void>
}

interface WorkoutPlayerRuntimeProps extends WorkoutSummaryOptions {
  initialWorkout?: ActiveWorkout
  activeWorkoutRepository?: ActiveWorkoutRepository
  plan: WorkoutPlan
  timeline: WorkoutPlaybackTimeline
  workoutDetailsPath: string
  saveWorkoutSession: (session: WorkoutSession) => Promise<void>
}

function WorkoutPlayerCompletedPanel({
  source,
  planName,
  workoutDetailsPath,
  saveState,
  hasRecorderError,
  hasNoWork,
  endedEarly,
  onRestart,
  onRetrySave,
  isRestartDisabled,
}: {
  source?: 'plan' | 'quickTimer'
  planName: string
  workoutDetailsPath: string
  saveState: WorkoutSessionSaveState
  hasRecorderError: boolean
  hasNoWork: boolean
  endedEarly: boolean
  onRestart: () => void
  onRetrySave: () => void
  isRestartDisabled: boolean
}) {
  const statusMessage = hasRecorderError
    ? WORKOUT_SESSION_RECORDER_ERROR_MESSAGE
    : hasNoWork
      ? WORKOUT_SESSION_NO_WORK_MESSAGE
      : saveState.status === 'saving'
        ? 'Zapisywanie treningu…'
        : saveState.status === 'saved'
          ? endedEarly ? workoutPlayerLabels.endedEarlySaved : 'Trening został zapisany.'
          : saveState.status === 'error'
            ? saveState.message
            : endedEarly ? workoutPlayerLabels.endedEarlyMessage : 'Trening został ukończony.'

  const showBackWithoutSave = hasRecorderError || saveState.status === 'error'

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 safe-area-pt pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
      <div className="shrink-0 border-b border-bd bg-surface px-4 py-3">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-crimson-ink">
          {hasNoWork ? workoutPlayerLabels.notSaved : endedEarly ? workoutPlayerLabels.endedEarly : 'Trening ukończony'}
        </p>
        <h1 className="mt-0.5 font-display text-[20px] font-bold text-ink">{hasNoWork ? workoutPlayerLabels.noWorkHeading : endedEarly ? workoutPlayerLabels.endedEarly : 'Trening zakończony'}</h1>
      </div>

      <div className="flex flex-1 flex-col px-1 pt-5">
        <p className="font-display text-[15px] font-semibold text-ink">{planName}</p>
        <p
          className="mt-3 max-w-prose text-[14px] leading-relaxed text-muted"
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>

        {saveState.status === 'error' && !hasRecorderError ? (
          <p className="mt-2 font-display text-[13px] font-semibold text-ink">
            Nie udało się zapisać treningu.
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-3">
          {saveState.status === 'error' && !hasRecorderError ? (
            <button
              type="button"
              onClick={onRetrySave}
              className={getButtonClassName({
                variant: 'primary',
                size: 'lg',
                className: 'w-full uppercase tracking-[0.08em]',
              })}
            >
              Spróbuj ponownie
            </button>
          ) : null}

          {!hasRecorderError ? (
            <button
              type="button"
              onClick={onRestart}
              disabled={isRestartDisabled}
              className={getButtonClassName({
                variant: saveState.status === 'error' ? 'secondary' : 'primary',
                size: 'lg',
                disabled: isRestartDisabled,
                className: [
                  'w-full uppercase tracking-[0.08em]',
                  isRestartDisabled ? 'pointer-events-none' : '',
                ]
                  .filter(Boolean)
                  .join(' '),
              })}
            >
              Uruchom ponownie
            </button>
          ) : null}

          <Link
            to={workoutDetailsPath}
            className={getButtonClassName({
              variant: 'secondary',
              size: 'md',
              className: 'w-full uppercase tracking-[0.06em]',
            })}
          >
            {showBackWithoutSave ? 'Wróć bez zapisu' : source === 'quickTimer' ? quickTimerLabels.back : 'Wróć do planu'}
          </Link>
        </div>
      </div>
    </div>
  )
}

function WorkoutPlayerRuntime({
  source = 'plan',
  focusSkills,
  focusSkillsUnavailable,
  onSessionSaved,
  initialWorkout,
  activeWorkoutRepository,
  plan,
  timeline,
  workoutDetailsPath,
  saveWorkoutSession,
}: WorkoutPlayerRuntimeProps) {
  const [preparation] = useState(readStoredWorkoutPreparation)
  const [endWarnings] = useState(readStoredWorkoutEndWarnings)
  const { onPlaybackEvent, completedSession, runGeneration, hasRecorderError, hasNoWork, endedEarly, getRecording } = useWorkoutSessionRecorder(plan, timeline, initialWorkout?.recorder, focusSkills, source)
  const { unlockGong, onGongPlaybackEvent, playEndWarning } = useWorkoutGong(timeline)
  const [soundMuted, setSoundMuted] = useState(!!initialWorkout)
  const enableSound = useCallback(() => { unlockGong(); setSoundMuted(false) }, [unlockGong])
  const handlePlaybackEvent = useCallback((event: WorkoutPlaybackEvent) => {
    onPlaybackEvent(event)
    onGongPlaybackEvent(event)
  }, [onPlaybackEvent, onGongPlaybackEvent])
  const { saveState, retrySave } = useWorkoutSessionAutoSave({
    completedSession,
    runGeneration,
    saveWorkoutSession,
  })

  const {
    playback,
    currentStep,
    canGoPrevious,
    canGoNext,
    start,
    startNow,
    pause,
    resume,
    goToPreviousStep,
    goToNextStep,
    finishCurrentExercise,
    endEarly,
    restart,
    adjustTime,
    getPlaybackSnapshot,
  } = useWorkoutPlayback(timeline, { onPlaybackEvent: handlePlaybackEvent, onEndWarning: playEndWarning,
    endWarnings, preparation, initialWorkout })

  const discard = useActiveWorkoutPersistence(plan, playback, getPlaybackSnapshot, getRecording, activeWorkoutRepository,
    saveState.status === 'saved' || hasNoWork, source)
  useEffect(() => {
    if (saveState.status === 'saved' || hasNoWork) activeWorkoutRepository?.clear()
  }, [saveState.status, hasNoWork, activeWorkoutRepository])
  useEffect(() => {
    if (saveState.status === 'saved' && completedSession) onSessionSaved?.(completedSession.id)
  }, [saveState.status, completedSession, onSessionSaved])

  useWorkoutScreenWakeLock(playback.status !== 'completed')

  const isPreparing = playback.status === 'preparing'
  const stepAnnouncement = isPreparing ? `${workoutPlayerLabels.preparing}.`
    : currentStep && playback.status !== 'idle' && playback.status !== 'completed'
      ? buildStepAnnouncement(currentStep, playback.currentStepIndex, timeline.steps.length) : ''

  const totalSteps = timeline.steps.length
  const isCompleted = playback.status === 'completed'
  const nextStep = isPreparing ? currentStep : timeline.steps[playback.currentStepIndex + 1] ?? null
  const isLastStep = !isPreparing && playback.currentStepIndex >= totalSteps - 1

  if (isCompleted) {
    return (
      <main className="flex min-h-dvh flex-col overflow-hidden bg-bg">
        <WorkoutPlayerCompletedPanel
          source={source}
          planName={plan.nameSnapshot}
          workoutDetailsPath={workoutDetailsPath}
          saveState={saveState}
          hasRecorderError={hasRecorderError}
          hasNoWork={hasNoWork}
          endedEarly={endedEarly}
          onRestart={() => { enableSound(); restart() }}
          onRetrySave={retrySave}
          isRestartDisabled={hasRecorderError || (!hasNoWork && saveState.status !== 'saved')}
        />
      </main>
    )
  }

  if (!currentStep) {
    return null
  }

  const stepDurationSeconds = isPreparing ? Number(preparation) : currentStep.durationSeconds
  const { phase, label } = getWorkoutTimerPhase(playback.status, currentStep.kind, playback.remainingSeconds)
  const isRoundRest = currentStep.kind === 'roundRest'
  const roundStep = isRoundRest ? timeline.steps[playback.currentStepIndex - 1] : currentStep
  const hasInstruction = Boolean(currentStep.instruction)

  return (
    <main className="workout-player flex min-h-dvh flex-col" data-phase={phase}>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col safe-area-pt">
        {focusSkillsUnavailable && <p role="status" className="player-focus-notice px-5 pt-3 text-sm leading-relaxed">{workoutPlayerLabels.focusSkillsUnavailable}</p>}
        <LiveScreenHeader
          title={plan.nameSnapshot}
          progress={workoutPlayerLabels.step(playback.currentStepIndex + 1, totalSteps)}
          action={soundMuted ? (
            <button type="button" onClick={enableSound} aria-label={workoutPlayerLabels.enableSound} className="player-icon-button topbar-sound-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5 6 9H2v6h4l5 4V5Zm4 4a4 4 0 0 1 0 6M3 3l18 18" />
              </svg>
            </button>
          ) : null}
            exit={<WorkoutPlayerExitControls
              status={playback.status}
              canFinishExercise={currentStep.kind !== 'break'}
              remainingRounds={countRemainingExerciseRounds(timeline.steps, playback.currentStepIndex)}
              workoutDetailsPath={workoutDetailsPath}
              onPause={pause}
              onResume={() => { enableSound(); resume() }}
              onDiscard={discard}
              onFinishExercise={() => finishCurrentExercise({
                expectedStepIndex: playback.currentStepIndex,
                expectedStepRevision: playback.stepRevision,
              })}
              onEndEarly={endEarly}
            />}
        />
        <div className="current-exercise-box">
          {roundStep && roundStep.roundNumber !== null && roundStep.roundCount !== null ? (
            <p className="exercise-round-eyebrow">{workoutPlayerLabels.round(roundStep.roundNumber, roundStep.roundCount)}</p>
          ) : null}
          {hasInstruction ? <h1 className="exercise-name">{currentStep.name}</h1> : null}
        </div>
        <div className="player-technique-slot">
          {hasInstruction ? (
            <p className="exercise-technique">{currentStep.instruction}</p>
          ) : (
            <h1 className="exercise-technique">{currentStep.name}</h1>
          )}
        </div>
        <WorkoutCircularTimer
          key={`${currentStep.id}:${playback.stepRevision}`}
          totalSeconds={stepDurationSeconds}
          remainingSeconds={playback.remainingSeconds}
          phaseLabel={label}
          preparing={isPreparing}
          onAdjustTime={!isPreparing && playback.status !== 'idle' ? (deltaSeconds) => {
            enableSound()
            adjustTime(deltaSeconds, {
              expectedStepIndex: playback.currentStepIndex,
              expectedStepRevision: playback.stepRevision,
            })
          } : undefined}
        />
        <WorkoutPlayerNextPreview roundStep={isRoundRest ? nextStep ?? undefined : roundStep} nextStep={nextStep} isLastStep={isLastStep} />

        <WorkoutPlayerControls
          status={playback.status}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          onStart={() => {
            enableSound()
            start()
          }}
          onStartNow={() => { enableSound(); startNow() }}
          onPause={pause}
          onResume={() => {
            enableSound()
            resume()
          }}
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
    </main>
  )
}

function WorkoutPlayerActiveContent({
  source,
  focusSkills,
  focusSkillsUnavailable,
  onSessionSaved,
  initialWorkout,
  activeWorkoutRepository,
  plan,
  workoutDetailsPath,
  saveWorkoutSession,
}: WorkoutPlayerActiveContentProps) {
  const timeline = useMemo(() => createWorkoutPlaybackTimeline(plan), [plan])

  return (
    <WorkoutPlayerRuntime
      source={source}
      focusSkills={focusSkills}
      focusSkillsUnavailable={focusSkillsUnavailable}
      onSessionSaved={onSessionSaved}
      initialWorkout={initialWorkout}
      activeWorkoutRepository={activeWorkoutRepository}
      key={timeline.identity}
      plan={plan}
      timeline={timeline}
      workoutDetailsPath={workoutDetailsPath}
      saveWorkoutSession={saveWorkoutSession}
    />
  )
}

export function WorkoutPlayerView({
  source,
  focusSkills,
  focusSkillsUnavailable,
  onSessionSaved,
  initialWorkout,
  activeWorkoutRepository,
  loadState,
  workoutsListPath,
  workoutDetailsPath,
  onRetry,
  saveWorkoutSession,
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

    return (
      <WorkoutPlayerActiveContent
        source={source}
        focusSkills={focusSkills}
        focusSkillsUnavailable={focusSkillsUnavailable}
        onSessionSaved={onSessionSaved}
        initialWorkout={initialWorkout}
        activeWorkoutRepository={activeWorkoutRepository}
        plan={loadState.plan}
        workoutDetailsPath={workoutDetailsPath}
        saveWorkoutSession={saveWorkoutSession}
      />
    )
  }

  if (loadState.status === 'success') {
    return renderContent()
  }

  return (
    <main className="flex min-h-dvh flex-col bg-bg">
      <div className="mx-auto w-full max-w-lg px-4 py-6 md:py-8">{renderContent()}</div>
    </main>
  )
}

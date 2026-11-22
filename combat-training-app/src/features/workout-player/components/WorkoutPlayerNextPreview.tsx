import type { WorkoutPlaybackStep } from '@/domain/workout-playback/workoutPlayback.types'
import { formatSecondsAsClock } from '@/domain/time/formatDuration'
import { getWorkoutStepKindShortLabelPl } from '@/features/workout-player/utils/workoutStepTimerPresentation'
import { workoutPlayerLabels as labels } from '@/features/workout-player/workoutPlayerLabels'

interface WorkoutPlayerNextPreviewProps {
  roundStep: WorkoutPlaybackStep | undefined
  nextStep: WorkoutPlaybackStep | null
  isLastStep: boolean
}

export function WorkoutPlayerNextPreview({ roundStep, nextStep, isLastStep }: WorkoutPlayerNextPreviewProps) {
  const roundNumber = roundStep?.roundNumber
  const roundCount = roundStep?.roundCount
  const nextRound = nextStep && nextStep.roundNumber !== null && nextStep.roundCount !== null
    ? labels.round(nextStep.roundNumber, nextStep.roundCount) : null

  return (
    <div className="next-preview-area">
      <div className="next-bar-4b">
        {roundNumber && roundCount ? (
          <div className="round-dots-row">
            <span>{labels.rounds}</span>
            <div className="dots-list" aria-hidden="true">
              {Array.from({ length: roundCount }, (_, index) => {
                const round = index + 1
                const state = round < roundNumber ? 'is-done' : round === roundNumber ? 'is-current' : ''
                return <span key={round} className={`round-dot ${state}`} />
              })}
            </div>
          </div>
        ) : null}
        <p className="player-next-step">
          {isLastStep ? labels.endOfWorkout : nextStep && (
            <>
              {labels.next}{' '}
              {nextStep.kind === 'roundRest' ? (
                <strong>{labels.roundRest} ({formatSecondsAsClock(nextStep.durationSeconds)})</strong>
              ) : (
                <>
                  <b>{nextStep.name}</b>
                  {' · '}{getWorkoutStepKindShortLabelPl(nextStep.kind)}
                  {nextRound && ` · ${nextRound}`}
                </>
              )}
            </>
          )}
        </p>
      </div>
    </div>
  )
}

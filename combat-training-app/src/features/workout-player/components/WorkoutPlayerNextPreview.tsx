import type { WorkoutPlaybackStep } from '@/features/workout-player/types/workoutPlayback.types'
import { getWorkoutStepKindShortLabelPl } from '@/features/workout-player/utils/workoutStepTimerPresentation'

interface WorkoutPlayerNextPreviewProps {
  nextStep: WorkoutPlaybackStep | null
  isLastStep: boolean
}

export function WorkoutPlayerNextPreview({ nextStep, isLastStep }: WorkoutPlayerNextPreviewProps) {
  if (isLastStep) {
    return (
      <p className="px-5 pb-3 text-center text-[11px] text-muted">
        Koniec treningu
      </p>
    )
  }

  if (!nextStep) {
    return null
  }

  const kindLabel = getWorkoutStepKindShortLabelPl(nextStep.kind)
  const roundLabel =
    nextStep.roundNumber !== null && nextStep.roundCount !== null
      ? ` · Runda ${nextStep.roundNumber} z ${nextStep.roundCount}`
      : ''

  return (
    <div className="shrink-0 px-5 pb-3 text-center">
      <p className="font-display text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">
        Następnie
      </p>
      <p className="mt-1 text-[11px] text-muted">
        <span className="font-semibold text-ink">{nextStep.name}</span>
        <span className="text-muted">
          {' '}
          · {kindLabel}
          {roundLabel}
        </span>
      </p>
    </div>
  )
}

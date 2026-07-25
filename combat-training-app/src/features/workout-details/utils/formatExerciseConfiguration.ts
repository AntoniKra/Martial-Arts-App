import type { WorkoutExercise } from '@/domain/workout/workout.types'
import { formatSecondsAsClock } from '@/features/workout-builder/utils/formatDuration'
import { formatPolishCount } from '@/features/workout-builder/utils/polishPlural'

function formatRoundLabel(roundCount: number): string {
  return formatPolishCount(roundCount, 'runda', 'rundy', 'rund')
}

export function formatExerciseConfigurationSummary(exercise: WorkoutExercise): string {
  if (exercise.configuration.mode === 'continuous') {
    return `Ciągłe · ${formatSecondsAsClock(exercise.configuration.durationSeconds)}`
  }

  const { roundCount, roundDurationSeconds, restBetweenRoundsSeconds } = exercise.configuration
  return `${formatRoundLabel(roundCount)} × ${formatSecondsAsClock(roundDurationSeconds)} · przerwa ${formatSecondsAsClock(restBetweenRoundsSeconds)}`
}

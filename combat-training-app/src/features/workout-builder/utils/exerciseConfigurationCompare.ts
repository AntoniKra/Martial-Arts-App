import type { ExerciseConfiguration } from '@/domain/workout/workout.types'

export function copyExerciseConfiguration(configuration: ExerciseConfiguration): ExerciseConfiguration {
  if (configuration.mode === 'continuous') {
    return {
      mode: 'continuous',
      durationSeconds: configuration.durationSeconds,
    }
  }

  return {
    mode: 'rounds',
    roundCount: configuration.roundCount,
    roundDurationSeconds: configuration.roundDurationSeconds,
    restBetweenRoundsSeconds: configuration.restBetweenRoundsSeconds,
  }
}

export function areExerciseConfigurationsEqual(
  left: ExerciseConfiguration,
  right: ExerciseConfiguration,
): boolean {
  if (left.mode !== right.mode) {
    return false
  }

  if (left.mode === 'continuous') {
    return right.mode === 'continuous' && left.durationSeconds === right.durationSeconds
  }

  return (
    right.mode === 'rounds' &&
    left.roundCount === right.roundCount &&
    left.roundDurationSeconds === right.roundDurationSeconds &&
    left.restBetweenRoundsSeconds === right.restBetweenRoundsSeconds
  )
}

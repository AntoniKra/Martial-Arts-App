import { WORKOUT_PREPARATION_VALUES } from '@/domain/workout-playback/workoutPreparation'

export const WORKOUT_PREPARATION_OPTIONS = WORKOUT_PREPARATION_VALUES.map((value) => ({
  value, label: `${value} s`,
}))

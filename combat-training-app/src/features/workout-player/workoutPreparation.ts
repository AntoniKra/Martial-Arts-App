export const WORKOUT_PREPARATION_DEFAULT = '10'

export const WORKOUT_PREPARATION_OPTIONS = [
  { value: '5', label: '5 s' },
  { value: '10', label: '10 s' },
  { value: '15', label: '15 s' },
  { value: '30', label: '30 s' },
] as const

export type WorkoutPreparation = (typeof WORKOUT_PREPARATION_OPTIONS)[number]['value']

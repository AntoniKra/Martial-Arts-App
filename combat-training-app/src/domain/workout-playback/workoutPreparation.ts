export const WORKOUT_PREPARATION_VALUES = ['5', '10', '15', '30'] as const

export type WorkoutPreparation = (typeof WORKOUT_PREPARATION_VALUES)[number]

export const WORKOUT_PREPARATION_DEFAULT = '10'

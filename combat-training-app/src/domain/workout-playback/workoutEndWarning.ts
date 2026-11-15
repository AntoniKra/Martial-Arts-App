export const ROUND_WARNING_VALUES = ['off', '5', '10', '15', '30'] as const
export const REST_WARNING_VALUES = ['off', '5', '10'] as const

export interface WorkoutEndWarnings {
  round: (typeof ROUND_WARNING_VALUES)[number]
  rest: (typeof REST_WARNING_VALUES)[number]
}

export const DEFAULT_WORKOUT_END_WARNINGS: WorkoutEndWarnings = { round: '10', rest: '10' }

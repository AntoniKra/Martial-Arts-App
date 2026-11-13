export type WorkoutGongSignal = 'workEnd' | 'restEnd' | 'workoutEnd' | 'endingSoon'

export interface WorkoutGong {
  unlock: () => void
  play: (signal: WorkoutGongSignal) => void
  dispose: () => void
}

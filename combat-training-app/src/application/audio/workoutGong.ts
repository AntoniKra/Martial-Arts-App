export type WorkoutGongSignal = 'workEnd' | 'restEnd' | 'workoutEnd'

export interface WorkoutGong {
  unlock: () => void
  play: (signal: WorkoutGongSignal) => void
  dispose: () => void
}

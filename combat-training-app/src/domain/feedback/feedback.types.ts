export type ExerciseExecutionRating = 1 | 2 | 3 | 4 | 5
export type ConcentrationRating = 1 | 2 | 3 | 4 | 5
export type GoalCompletionRating = 1 | 2 | 3 | 4 | 5
export type PerceivedProgressRating = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type RpeRating = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export type DiscomfortLevel = 'none' | 'mild' | 'clear' | 'limiting'

export interface WorkoutFeedback {
  rpe: RpeRating | null
  concentrationRating: ConcentrationRating | null
  discomfortLevel: DiscomfortLevel | null
  discomfortArea: string | null
  goalCompletionRating: GoalCompletionRating | null
  perceivedProgressRating: PerceivedProgressRating | null
  hasProgressReference: boolean
  workoutConclusions: string | null
}

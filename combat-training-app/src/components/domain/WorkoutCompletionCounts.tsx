interface WorkoutCompletionCountsProps {
  counts: {
    completedExercises: number
    plannedExercises: number
    completedRounds: number | null
    plannedRounds: number | null
  }
}

export function WorkoutCompletionCounts({ counts }: WorkoutCompletionCountsProps) {
  return (
    <>
      <span className="whitespace-nowrap">
        <span className="font-semibold tabular-nums text-ink">
          {counts.completedExercises}/{counts.plannedExercises}
        </span>{' '}
        ćwiczeń
      </span>
      {counts.plannedRounds !== null ? (
        <span className="whitespace-nowrap">
          <span className="font-semibold tabular-nums text-ink">
            {counts.completedRounds}/{counts.plannedRounds}
          </span>{' '}
          rund
        </span>
      ) : null}
    </>
  )
}

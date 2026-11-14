import type { WorkoutFeedbackDraft } from '@/domain/workout-session/workoutFeedback'

export function hasUnsavedWorkoutFeedback(draft: WorkoutFeedbackDraft, initial: WorkoutFeedbackDraft): boolean {
  const focusValues = (value: WorkoutFeedbackDraft) => value.focusRatings.map((rating) => ({ ...rating,
    correction: rating.correction?.problem || rating.correction?.fix ? rating.correction : null,
  }))
  return (draft.note ?? '') !== (initial.note ?? '')
    || JSON.stringify(focusValues(draft)) !== JSON.stringify(focusValues(initial))
    || JSON.stringify(draft.sparring) !== JSON.stringify(initial.sparring)
    || draft.exerciseRatings.length !== initial.exerciseRatings.length
    || draft.exerciseRatings.some((rating) => initial.exerciseRatings.find((value) => value.workoutItemId === rating.workoutItemId)?.rating !== rating.rating)
}

import * as z from 'zod/mini'
import type { WorkoutFeedbackDraft } from '@/domain/workout-session/workoutFeedback'
import { workoutFeedbackLabels as labels } from './workoutFeedbackLabels'

const correctionText = z.string().check(z.minLength(1), z.maxLength(200))
const noteSchema = z.string().check(z.maxLength(1000))
export type FeedbackErrors = { note?: string; corrections: Record<string, string> }
export type FeedbackValidation = { ok: true; values: WorkoutFeedbackDraft } | { ok: false; errors: FeedbackErrors }

export function isValidCorrectionText(value: string): boolean {
  return correctionText.safeParse(value.trim()).success
}

export function validateWorkoutFeedback(draft: WorkoutFeedbackDraft): FeedbackValidation {
  const errors: FeedbackErrors = { corrections: {} }
  const focusRatings = draft.focusRatings.map((rating) => {
    const problem = rating.correction?.problem.trim() ?? ''
    const fix = rating.correction?.fix.trim() ?? ''
    if ((problem || fix) && (!isValidCorrectionText(problem) || !isValidCorrectionText(fix))) {
      errors.corrections[rating.workoutItemId] = labels.correctionError
    }
    return { ...rating, correction: problem || fix ? { problem, fix } : null }
  })
  const note = draft.note?.trim() || null
  if (note !== null && !noteSchema.safeParse(note).success) errors.note = labels.noteError
  return errors.note || Object.keys(errors.corrections).length ? { ok: false, errors }
    : { ok: true, values: { ...draft, focusRatings, note } }
}

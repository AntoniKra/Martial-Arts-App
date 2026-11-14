import { expect, it } from 'vitest'
import type { WorkoutFeedbackDraft } from '@/domain/workout-session/workoutFeedback'
import { workoutSession } from '@/test/workoutSessionBuilders'
import { hasUnsavedWorkoutFeedback } from './unsavedWorkoutFeedback'

const initial: WorkoutFeedbackDraft = {
  focusRatings: [{ workoutItemId: 'focus', focusSkillId: 'guard', skillNameSnapshot: 'Guard',
    criterionSnapshot: 'Hand returns to chin', blockType: 'technique', assessment: null, correction: null, previousCorrectionCheck: null }],
  exerciseRatings: [
    { workoutItemId: 'first', nameSnapshot: 'First', blockType: 'bag', rating: 3 },
    { workoutItemId: 'second', nameSnapshot: 'Second', blockType: 'bag', rating: 4 },
  ],
  sparring: [{ blockId: 'sparring', intensity: null, rounds: 1 }], note: null,
}

it('accepts unchanged values, empty notes and restored ratings regardless of array order', () => {
  const draft = structuredClone(initial)
  expect(hasUnsavedWorkoutFeedback(draft, initial)).toBe(false)
  draft.note = ''
  draft.exerciseRatings.reverse()
  draft.focusRatings[0].correction = { problem: '', fix: '' }
  expect(hasUnsavedWorkoutFeedback(draft, initial)).toBe(false)
})

it.each<{ field: string; change: (draft: WorkoutFeedbackDraft) => void }>([
  { field: 'note', change: (draft) => { draft.note = 'New note' } },
  { field: 'focus assessment', change: (draft) => { draft.focusRatings[0].assessment = 3 } },
  { field: 'unable to assess', change: (draft) => { draft.focusRatings[0].assessment = 'unableToRate' } },
  { field: 'correction', change: (draft) => { draft.focusRatings[0].correction = { problem: 'Guard drops', fix: 'Raise hand' } } },
  { field: 'previous correction check', change: (draft) => { draft.focusRatings[0].previousCorrectionCheck = 'better' } },
  { field: 'other rating', change: (draft) => { draft.exerciseRatings[0].rating = 5 } },
  { field: 'cleared rating', change: (draft) => { draft.exerciseRatings.pop() } },
  { field: 'new rating', change: (draft) => { draft.exerciseRatings.push({ ...draft.exerciseRatings[0], workoutItemId: 'third' }) } },
  { field: 'sparring intensity', change: (draft) => { draft.sparring[0].intensity = 'technical' } },
])('detects a changed $field without modifying the initial snapshot', ({ change }) => {
  const snapshot = structuredClone(initial)
  const draft = structuredClone(initial)
  change(draft)
  expect(hasUnsavedWorkoutFeedback(draft, initial)).toBe(true)
  expect(initial).toEqual(snapshot)
  expect(hasUnsavedWorkoutFeedback(structuredClone(initial), initial)).toBe(false)
})

it('ignores independently saved RPE and other session metadata', () => {
  const session = workoutSession(initial)
  const updated = { ...session, rpe: 8, updatedAt: '2026-11-14T12:00:00.000Z' }
  expect(hasUnsavedWorkoutFeedback(updated, session)).toBe(false)
})

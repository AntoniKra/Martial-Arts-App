import { describe, expect, it } from 'vitest'
import { validateWorkoutFeedback } from './validateWorkoutFeedback'
import type { FocusRating } from '@/domain/workout-session/workoutSession.types'

const rating: FocusRating = { workoutItemId: 'item', focusSkillId: 'skill', skillNameSnapshot: 'Guard', criterionSnapshot: 'Chin',
  blockType: 'bag', assessment: null, correction: null, previousCorrectionCheck: null }
describe('feedback form validation', () => {
  it('accepts no ratings, trims notes and treats an empty correction as optional', () => {
    expect(validateWorkoutFeedback({ focusRatings: [{ ...rating, correction: { problem: ' ', fix: '' } }], exerciseRatings: [], note: ' note ' }))
      .toEqual({ ok: true, values: { focusRatings: [rating], exerciseRatings: [], note: 'note' } })
  })
  it.each([{ problem: 'Problem', fix: '' }, { problem: 'x'.repeat(201), fix: 'Fix' }])('rejects an incomplete or overlong correction', (correction) => {
    expect(validateWorkoutFeedback({ focusRatings: [{ ...rating, correction }], exerciseRatings: [], note: null })).toMatchObject({ ok: false })
  })
  it('accepts boundary lengths and rejects an overlong workout note', () => {
    expect(validateWorkoutFeedback({ focusRatings: [{ ...rating, correction: { problem: 'x'.repeat(200), fix: 'y' } }], exerciseRatings: [], note: 'x'.repeat(1000) }).ok).toBe(true)
    expect(validateWorkoutFeedback({ focusRatings: [], exerciseRatings: [], note: 'x'.repeat(1001) })).toMatchObject({ ok: false })
  })
})

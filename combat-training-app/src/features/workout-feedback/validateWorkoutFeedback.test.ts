import { describe, expect, it } from 'vitest'
import { isValidCorrectionText, validateWorkoutFeedback } from './validateWorkoutFeedback'
import type { FocusRating } from '@/domain/workout-session/workoutSession.types'

const rating: FocusRating = { workoutItemId: 'item', focusSkillId: 'skill', skillNameSnapshot: 'Guard', criterionSnapshot: 'Chin',
  blockType: 'bag', assessment: null, correction: null, previousCorrectionCheck: null }
describe('feedback form validation', () => {
  it.each([
    { problem: 'Problem', fix: '', invalid: { problem: false, fix: true } },
    { problem: '', fix: 'Fix', invalid: { problem: true, fix: false } },
    { problem: ' \n ', fix: 'Fix', invalid: { problem: true, fix: false } },
    { problem: 'Problem', fix: ' \t ', invalid: { problem: false, fix: true } },
    { problem: 'x'.repeat(201), fix: 'Fix', invalid: { problem: true, fix: false } },
    { problem: 'Problem', fix: 'x'.repeat(201), invalid: { problem: false, fix: true } },
    { problem: ` ${'x'.repeat(200)} `, fix: ' Fix ', invalid: { problem: false, fix: false } },
  ])('identifies invalid correction fields independently: $invalid', ({ problem, fix, invalid }) => {
    expect({ problem: !isValidCorrectionText(problem), fix: !isValidCorrectionText(fix) }).toEqual(invalid)
  })

  it.each([{ problem: '', fix: '' }, { problem: ' \n ', fix: ' \t ' }])('accepts both empty correction fields without an error and trims notes', (correction) => {
    expect(validateWorkoutFeedback({ focusRatings: [{ ...rating, correction }], exerciseRatings: [], note: ' note ' }))
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

import { describe, expect, it } from 'vitest'
import { validateWellbeing, WELLBEING_FIELDS, type WellbeingEntry } from '@/domain/wellbeing/wellbeing'
import { countWellbeingAnswers, startWellbeingWizard, wellbeingWizardReducer } from './wellbeingWizard'

describe('wellbeing wizard', () => {
  it('requires an answer before advancing and stops at the first and fifth steps', () => {
    let state = startWellbeingWizard()
    expect(wellbeingWizardReducer(state, { type: 'back' })).toBe(state)
    for (const [step, field] of WELLBEING_FIELDS.entries()) {
      expect(state.step).toBe(step)
      expect(countWellbeingAnswers(state.answers)).toBe(step)
      expect(wellbeingWizardReducer(state, { type: 'next' })).toBe(state)
      state = wellbeingWizardReducer(state, { type: 'answer', field, value: step + 1 })
      expect(countWellbeingAnswers(state.answers)).toBe(step + 1)
      state = wellbeingWizardReducer(state, { type: 'next' })
    }
    expect(state.step).toBe(4)
    expect(wellbeingWizardReducer(state, { type: 'next' })).toBe(state)
    expect(wellbeingWizardReducer(state, { type: 'back' }).step).toBe(3)
  })

  it('keeps answers and note while navigating back and forward', () => {
    let state = startWellbeingWizard()
    for (const field of WELLBEING_FIELDS) {
      state = wellbeingWizardReducer(state, { type: 'answer', field, value: 4 })
      state = wellbeingWizardReducer(state, { type: 'next' })
    }
    expect(state.note).toBe('')
    expect(validateWellbeing(state.answers, state.note)).toBe(true)
    state = wellbeingWizardReducer(state, { type: 'note', value: 'Po spacerze' })
    state = wellbeingWizardReducer(state, { type: 'back' })
    expect(state.answers.stress).toBe(4)
    state = wellbeingWizardReducer(state, { type: 'answer', field: 'stress', value: 5 })
    state = wellbeingWizardReducer(state, { type: 'next' })
    expect(countWellbeingAnswers(state.answers)).toBe(4)
    expect(state.answers.stress).toBe(5)
    expect(state.note).toBe('Po spacerze')
    expect(validateWellbeing(state.answers, state.note)).toBe(true)
  })

  it('starts editing at the first question with all answers and the previous note', () => {
    const entry: WellbeingEntry = {
      sleep: 1, energy: 2, soreness: 3, stress: 5, note: 'Po spacerze',
      date: '2026-11-19', questionsVersion: 1, createdAt: '2026-11-19T07:00:00Z', updatedAt: '2026-11-19T07:00:00Z',
    }
    const state = startWellbeingWizard(entry)
    expect(state).toEqual({ step: 0, answers: { sleep: 1, energy: 2, soreness: 3, stress: 5 }, note: 'Po spacerze' })
    expect(countWellbeingAnswers(state.answers)).toBe(4)
    expect(wellbeingWizardReducer(state, { type: 'next' }).step).toBe(1)
  })
})

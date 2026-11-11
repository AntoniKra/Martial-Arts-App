import { describe, expect, it } from 'vitest'
import { selectWeekPlan } from './selectWeekPlan'
import type { WeekPlanCollectionState } from './useWeekPlanCollection'

const state: WeekPlanCollectionState = { status: 'ready', items: [], complete: true, rangeStart: '2026-08-17',
  pendingIds: new Set(), hasPendingWrites: false, fromCache: false, invalidDocumentIds: [] }
describe('safe weekly data availability', () => {
  it('recognizes an absent goal only after complete coverage', () => {
    expect(selectWeekPlan(state, '2026-11-09')).toEqual({ status: 'ready', plan: undefined })
    expect(selectWeekPlan({ ...state, complete: false, fromCache: true }, '2026-11-09').status).toBe('incomplete')
  })
  it('allows a validated cached plan to be edited offline without assuming the query is complete', () => {
    const plan = { weekStart: '2026-11-09', items: [], createdAt: '2026-11-09T00:00:00.000Z', updatedAt: '2026-11-09T00:00:00.000Z', editedAfterWeekEnd: false }
    expect(selectWeekPlan({ ...state, complete: false, fromCache: true, items: [plan] }, plan.weekStart)).toEqual({ status: 'ready', plan })
  })
  it.each(['loading', 'error'] as const)('does not treat %s as an empty plan', (status) => {
    expect(selectWeekPlan({ ...state, status }, '2026-11-09').status).toBe(status)
  })
  it('distinguishes invalid documents and weeks outside the query', () => {
    expect(selectWeekPlan({ ...state, invalidDocumentIds: ['2026-11-09'] }, '2026-11-09').status).toBe('error')
    expect(selectWeekPlan(state, '2026-08-10').status).toBe('outsideRange')
    expect(selectWeekPlan(state, '2026-11-10').status).toBe('outsideRange')
    expect(selectWeekPlan(state, '2026-12-07').status).toBe('ready')
  })
})

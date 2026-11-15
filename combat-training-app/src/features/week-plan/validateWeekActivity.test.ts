import { describe, expect, it } from 'vitest'
import { validateWeekActivity, type WeekActivityDraft } from './validateWeekActivity'

const draft: WeekActivityDraft = { kind: 'club', days: [1, 3], anyDay: false, disciplineKey: 'muay_thai', startTime: '19:00', endTime: '20:30',
  parts: ['technique'], clubName: ' Club ', category: 'bag', workoutPlanId: null, planNameSnapshot: null }
describe('week activity form validation', () => {
  it('creates separate recurring weekdays with trimmed optional club and unique ids', () => {
    let id = 0
    const items = validateWeekActivity(draft, () => String(++id))
    expect(items).toEqual([1, 3].map((day, index) => ({ id: String(index + 1), kind: 'club', day, disciplineKey: 'muay_thai',
      startTime: '19:00', endTime: '20:30', parts: ['technique'], clubName: 'Club' })))
  })
  it.each([{ days: [] }, { disciplineKey: '' }, { startTime: '29:00' }, { endTime: '18:00' }, { endTime: '19:00' }, { clubName: 'x'.repeat(101) }])('rejects invalid input %j', (fields) => {
    expect(validateWeekActivity({ ...draft, ...fields } as WeekActivityDraft, () => 'id')).toBeNull()
  })
  it('creates a flexible own workout or a rest day without club fields', () => {
    expect(validateWeekActivity({ ...draft, kind: 'own', anyDay: true, days: [], disciplineKey: '' }, () => 'id')).toEqual([
      { id: 'id', kind: 'own', day: null, category: 'bag', workoutPlanId: null, planNameSnapshot: null },
    ])
    expect(validateWeekActivity({ ...draft, kind: 'rest', days: [2] }, () => 'id')).toEqual([{ id: 'id', kind: 'rest', day: 2 }])
  })
})

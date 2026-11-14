import { describe, expect, it } from 'vitest'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import { categorizeWellbeing, describeWellbeing, validateWellbeing, wellbeingBaseline, wellbeingWorkoutContext, type WellbeingEntry } from './wellbeing'
import { hasWellbeingConsent } from './wellbeingConsent'

const today = '2026-11-14', instant = `${today}T09:00:00.000Z`
const entry = (offset: number, patch: Partial<WellbeingEntry> = {}): WellbeingEntry => ({ date: shiftCalendarDate(today, offset), sleep: 3, energy: 3, soreness: 3, stress: 3,
  note: null, questionsVersion: 1, createdAt: instant, updatedAt: instant, ...patch })
const history = Array.from({ length: 28 }, (_, i) => entry(i - 28))

describe('personal wellbeing baseline', () => {
  it('requires 14 entries and 21 calendar days inclusive, not just the age of an account', () => {
    const thirteen = [entry(-21), ...Array.from({ length: 12 }, (_, i) => entry(i - 12))]
    expect(wellbeingBaseline(thirteen, today, 1)).toMatchObject({ count: 13, missingEntries: 1, norms: { sleep: null } })
    const twentyDays = [entry(-20), ...Array.from({ length: 13 }, (_, i) => entry(i - 13))]
    expect(wellbeingBaseline(twentyDays, today, 1)).toMatchObject({ count: 14, spanDays: 20, norms: { sleep: null } })
    const twentyOne = [entry(-21), ...twentyDays.slice(1)]
    expect(wellbeingBaseline(twentyOne, today, 1)).toMatchObject({ count: 14, spanDays: 21, norms: { sleep: { median: 3, p25: 3, p75: 3 } } })
  })
  it('includes day minus 28, excludes today, future days, day minus 29 and other question versions', () => {
    const data = [...history, entry(-29, { sleep: 1 }), entry(0, { sleep: 1 }), entry(1, { sleep: 1 }), entry(-30, { questionsVersion: 2 })]
    expect(wellbeingBaseline(data, today, 1)).toMatchObject({ count: 28, norms: { sleep: { median: 3, p25: 3, p75: 3 } } })
    expect(wellbeingBaseline(data, today, 2).norms.sleep).toBeNull()
  })
  it('calculates questions independently with interpolated quartiles, including ties and threshold equality', () => {
    const data = history.slice(0, 16).map((item, i) => ({ ...item, date: shiftCalendarDate(today, -28 + Math.floor(i * 1.7)), sleep: i < 4 ? 1 : i < 12 ? 3 : 5, energy: 4 }))
    const norms = wellbeingBaseline(data, today, 1).norms
    expect(norms.sleep).toEqual({ median: 3, p25: 2.5, p75: 3.5 })
    expect(norms.energy).toEqual({ median: 4, p25: 4, p75: 4 })
    expect(categorizeWellbeing(1, norms.sleep!)).toBe('worse')
    expect(categorizeWellbeing(3, norms.sleep!)).toBe('typical')
    expect(categorizeWellbeing(5, norms.sleep!)).toBe('better')
    expect(categorizeWellbeing(4, norms.energy!)).toBe('typical')
  })
  it('counts consecutive worse entries using each days prior baseline, without imputing gaps', () => {
    const data = [...history.filter((item) => item.date < shiftCalendarDate(today, -4)), entry(-4, { sleep: 1 }), entry(-2, { sleep: 1 }), entry(0, { sleep: 1 })]
    expect(describeWellbeing(data, data.at(-1)!).fields[0]).toMatchObject({ category: 'worse', worseEntries: 3 })
    data[data.length - 2] = entry(-2, { sleep: 3 })
    expect(describeWellbeing(data, data.at(-1)!).fields[0].worseEntries).toBe(1)
  })
  it('restarts after a question version change and never obtains a baseline from the evaluated entry', () => {
    const data = [...history, entry(0, { questionsVersion: 2, sleep: 1 })]
    expect(describeWellbeing(data, data.at(-1)!).fields[0]).toMatchObject({ norm: null, category: null, worseEntries: 0 })
    expect(wellbeingWorkoutContext(data, today)).toBeNull()
  })
  it('returns no workout context without an entry or norm, and only worse questions otherwise', () => {
    expect(wellbeingWorkoutContext(history, today)).toBeNull()
    expect(wellbeingWorkoutContext([entry(0)], today)).toBeNull()
    expect(wellbeingWorkoutContext([...history, entry(0)], today)).toEqual([])
    expect(wellbeingWorkoutContext([...history, entry(0, { sleep: 1, stress: 5, energy: 2 })], today)).toEqual(['sleep', 'energy'])
  })
})
describe('wellbeing form and separate consent', () => {
  it.each([null, 0, 6, 2.5, NaN])('rejects missing or invalid rating %s', (sleep) => {
    expect(validateWellbeing({ sleep, energy: 3, soreness: 3, stress: 3 }, '')).toBe(false)
  })
  it('accepts both boundaries and optional text up to 300 characters', () => {
    expect(validateWellbeing({ sleep: 1, energy: 5, soreness: 1, stress: 5 }, 'x'.repeat(300))).toBe(true)
    expect(validateWellbeing(entry(0), 'x'.repeat(301))).toBe(false)
  })
  it('does not treat body weight consent or an old profile as wellbeing consent', () => {
    const profile = { healthDataConsent: { grantedAt: instant, adultConfirmed: true as const, noticeVersion: '2026-11' }, weightClassLabel: null, createdAt: instant, updatedAt: instant }
    expect(hasWellbeingConsent(profile)).toBe(false)
    expect(hasWellbeingConsent({ ...profile, wellbeingConsent: null })).toBe(false)
    expect(hasWellbeingConsent({ ...profile, wellbeingConsent: profile.healthDataConsent })).toBe(true)
  })
})

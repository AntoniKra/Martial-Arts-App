import { describe, expect, it } from 'vitest'
import { calculateSevenDayWeight, calculateWeeklyWeights, createConsentWithdrawalBatches, hasValidHealthConsent,
  isMeasurementDate, parseWeightClassLabel, parseWeightKg } from './bodyWeight'
import type { AthleteProfile, BodyWeight } from './profile.types'

const today = '2027-01-03'
const instant = '2027-01-03T09:00:00.000Z'
const weight = (date: string, weightKg = 76.4): BodyWeight => ({ date, weightKg, createdAt: instant, updatedAt: instant })

describe('body weight calculations', () => {
  it('uses today and six previous calendar days across a year boundary, with no invented zero', () => {
    expect(calculateSevenDayWeight([], today)).toMatchObject({ averageKg: null, count: 0, latest: null })
    expect(calculateSevenDayWeight([weight('2026-12-26', 90)], today)).toMatchObject({ averageKg: null, count: 0, latest: weight('2026-12-26', 90) })
    expect(calculateSevenDayWeight([weight('2026-12-27', 70), weight(today, 70.1), weight('2026-12-26', 90), weight('2027-01-04', 90)], today))
      .toMatchObject({ start: '2026-12-28', averageKg: 70.1, count: 1, latest: weight(today, 70.1) })
  })
  it('averages one or seven measurements and rounds once to a tenth', () => {
    expect(calculateSevenDayWeight([weight(today)], today)).toMatchObject({ count: 1, averageKg: 76.4 })
    const weights = Array.from({ length: 7 }, (_, index) => weight(`2026-12-${28 + index}`))
    weights[4] = weight('2027-01-01', 76.5); weights[5] = weight('2027-01-02', 76.5); weights[6] = weight(today, 76.5)
    expect(calculateSevenDayWeight(weights, today)).toMatchObject({ count: 7, averageKg: 76.4 })
    expect(calculateSevenDayWeight([weight(today, 76.4), weight('2027-01-02', 76.5)], today).averageKg).toBe(76.5)
  })
  it('returns twelve Monday to Sunday weeks with gaps and a current incomplete week', () => {
    const points = calculateWeeklyWeights([weight('2026-10-12', 70), weight('2026-10-11', 80),
      weight('2026-12-21', 75), weight('2026-12-27', 77), weight(today, 76.5), weight('2027-01-04', 100)], today)
    expect(points).toHaveLength(12)
    expect(points[0]).toEqual({ weekStart: '2026-10-12', averageKg: 70, count: 1, isCurrent: false })
    expect(points[1]).toMatchObject({ averageKg: null, count: 0 })
    expect(points[10]).toMatchObject({ weekStart: '2026-12-21', averageKg: 76, count: 2 })
    expect(points[11]).toEqual({ weekStart: '2026-12-28', averageKg: 76.5, count: 1, isCurrent: true })
  })
})

describe('profile input and consent', () => {
  it.each([['30', 30], ['250.0', 250], ['76,45', 76.5], ['76.44', 76.4], [' 76,4 ', 76.4],
    ['29.99', null], ['250.01', null], ['', null], ['NaN', null], ['7e1', null], ['76,4.1', null], ['-77', null]])(
    'parses %s as %s', (input, expected) => expect(parseWeightKg(String(input))).toBe(expected),
  )
  it('allows empty or 1–20 character labels and rejects longer labels', () => {
    expect(parseWeightClassLabel(' ')).toBeNull()
    expect(parseWeightClassLabel(' −77 kg ')).toBe('−77 kg')
    expect(parseWeightClassLabel('x'.repeat(20))).toHaveLength(20)
    expect(parseWeightClassLabel('x'.repeat(21))).toBeUndefined()
  })
  it('validates real past dates without restricting their age', () => {
    expect(isMeasurementDate('2000-02-29', today)).toBe(true)
    expect(isMeasurementDate(today, today)).toBe(true)
    for (const date of ['2027-01-04', '2026-02-29', '2026-11-31', '03.01.2027', '']) expect(isMeasurementDate(date, today)).toBe(false)
  })
  it('recognizes consent and handles a missing profile or null consent', () => {
    const profile: AthleteProfile = { healthDataConsent: { grantedAt: instant, adultConfirmed: true, noticeVersion: '2026-11' },
      weightClassLabel: null, createdAt: instant, updatedAt: instant }
    expect(hasValidHealthConsent(profile)).toBe(true)
    for (const value of [undefined, null, { ...profile, healthDataConsent: null }]) expect(hasValidHealthConsent(value)).toBe(false)
  })
})

describe('withdrawal batches', () => {
  it.each([0, 1, 499, 500, 1200])('deletes %s documents before clearing consent in the last batch', (count) => {
    const ids = Array.from({ length: count }, (_, index) => String(index))
    const batches = createConsentWithdrawalBatches(ids)
    expect(batches.flatMap((batch) => batch.ids)).toEqual(ids)
    expect(batches.filter((batch) => batch.withdrawConsent)).toEqual([batches.at(-1)])
    expect(batches.every((batch) => batch.ids.length + Number(batch.withdrawConsent) <= 499)).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { formatProfileDurationSecondsPl } from './profileLabels'

describe('profile duration labels', () => {
  it.each([
    [45, '45 min'], [59, '59 min'], [60, '1 h'], [61, '1 h 1 min'],
    [76, '1 h 16 min'], [180, '3 h'], [2535, '42 h 15 min'],
  ])('formats %s minutes as %s', (minutes, expected) => {
    expect(formatProfileDurationSecondsPl(minutes * 60)).toBe(expected)
  })

  it('rounds summed fractional minutes before splitting hours and keeps sub-minute precision', () => {
    expect(formatProfileDurationSecondsPl(59 * 60 + 0.5)).toBe('1 h')
    expect(formatProfileDurationSecondsPl(60 * 60 + 0.5)).toBe('1 h 1 min')
    expect(formatProfileDurationSecondsPl(0)).toBe('0 s')
    expect(formatProfileDurationSecondsPl(30.5)).toBe('30.5 s')
  })
})

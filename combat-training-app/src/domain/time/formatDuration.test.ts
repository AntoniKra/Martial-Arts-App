import { describe, expect, it } from 'vitest'

import { formatEstimatedDuration, formatSecondsAsClock } from '@/domain/time/formatDuration'

describe('duration formatting', () => {
  it.each([[0, '0:00'], [150, '2:30'], [3599, '59:59'], [3600, '1 h'], [3660, '1 h 1 min']])(
    'formats %i seconds as %s', (seconds, expected) => {
      expect(formatEstimatedDuration(Number(seconds))).toBe(expected)
    },
  )

  it('retains the timer clock format for an hour', () => {
    expect(formatSecondsAsClock(3600)).toBe('60:00')
  })
})

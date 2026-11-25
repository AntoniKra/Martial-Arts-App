import { describe, expect, it } from 'vitest'

import { formatEstimatedDuration, formatSecondsAsClock } from '@/domain/time/formatDuration'

describe('duration formatting', () => {
  it.each([[0, '0:00'], [150, '2:30'], [3599, '59:59'], [3600, '1 h'], [3660, '1 h 1 min']])(
    'formats %i seconds as %s', (seconds, expected) => {
      expect(formatEstimatedDuration(Number(seconds))).toBe(expected)
    },
  )

  it.each([[0, '0:00'], [65, '1:05'], [660, '11:00'], [3600, '60:00'], [86_400, '1440:00']])(
    'formats %i seconds on the clock as %s', (seconds, expected) => {
      expect(formatSecondsAsClock(Number(seconds))).toBe(expected)
    },
  )
})

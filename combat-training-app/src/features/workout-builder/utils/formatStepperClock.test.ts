import { describe, expect, it } from 'vitest'

import { formatStepperClock } from './formatStepperClock'

describe('formatStepperClock', () => {
  it('pads minutes and seconds to two digits', () => {
    expect(formatStepperClock(0)).toBe('00:00')
    expect(formatStepperClock(65)).toBe('01:05')
    expect(formatStepperClock(660)).toBe('11:00')
  })

  it('keeps counting minutes above an hour, the same way a time is typed', () => {
    expect(formatStepperClock(86_400)).toBe('1440:00')
  })
})

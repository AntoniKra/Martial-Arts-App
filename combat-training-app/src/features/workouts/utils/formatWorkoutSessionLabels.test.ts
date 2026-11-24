import { describe, expect, it } from 'vitest'
import { formatActiveDurationSecondsPl } from './formatWorkoutSessionLabels'

describe('active duration label', () => {
  it('shows whole seconds for short sessions with millisecond precision', () => {
    expect(formatActiveDurationSecondsPl(11.943)).toBe('12 s')
    expect(formatActiveDurationSecondsPl(25.563)).toBe('26 s')
    expect(formatActiveDurationSecondsPl(0)).toBe('0 s')
  })

  it('switches to rounded-up minutes from one minute', () => {
    expect(formatActiveDurationSecondsPl(59.6)).toBe('1 min')
    expect(formatActiveDurationSecondsPl(60)).toBe('1 min')
    expect(formatActiveDurationSecondsPl(2521)).toBe('43 min')
  })
})

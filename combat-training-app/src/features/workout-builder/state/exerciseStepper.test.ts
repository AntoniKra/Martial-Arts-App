import { describe, expect, it } from 'vitest'

import { canStep, parseStepperEntry, stepValue } from './exerciseStepper'

describe('stepValue', () => {
  it('adds 15 s to the round duration', () => {
    expect(stepValue('roundDuration', 180, 1)).toBe(195)
  })

  it('changes the round count by one', () => {
    expect(stepValue('roundCount', 3, 1)).toBe(4)
    expect(stepValue('roundCount', 3, -1)).toBe(2)
  })

  it('moves an off-grid time to the nearest multiple of 15 s in the step direction', () => {
    expect(stepValue('roundDuration', 100, 1)).toBe(105)
    expect(stepValue('roundDuration', 100, -1)).toBe(90)
    expect(stepValue('rest', 44, -1)).toBe(30)
    expect(stepValue('continuousDuration', 301, 1)).toBe(315)
  })

  it('never leaves the limits of the current validation', () => {
    expect(stepValue('roundCount', 99, 1)).toBe(99)
    expect(stepValue('roundCount', 1, -1)).toBe(1)
    expect(stepValue('roundDuration', 10, -1)).toBe(1)
    expect(stepValue('roundDuration', 86_400, 1)).toBe(86_400)
    expect(stepValue('rest', 15, -1)).toBe(0)
    expect(stepValue('rest', 86_399, 1)).toBe(86_400)
    expect(stepValue('continuousDuration', 15, -1)).toBe(1)
  })
})

describe('parseStepperEntry', () => {
  it('reads a typed round count', () => {
    expect(parseStepperEntry('roundCount', ' 12 ')).toEqual({ ok: true, value: 12 })
  })

  it('rejects a round count outside 1–99', () => {
    expect(parseStepperEntry('roundCount', '0')).toEqual({ ok: false, error: 'roundCount' })
    expect(parseStepperEntry('roundCount', '100')).toEqual({ ok: false, error: 'roundCount' })
    expect(parseStepperEntry('roundCount', '2.5')).toEqual({ ok: false, error: 'roundCount' })
    expect(parseStepperEntry('roundCount', '')).toEqual({ ok: false, error: 'roundCount' })
  })

  it('reads a time typed as m:ss or as seconds', () => {
    expect(parseStepperEntry('roundDuration', '2:30')).toEqual({ ok: true, value: 150 })
    expect(parseStepperEntry('roundDuration', '02:05')).toEqual({ ok: true, value: 125 })
    expect(parseStepperEntry('rest', '45')).toEqual({ ok: true, value: 45 })
    expect(parseStepperEntry('rest', '0:00')).toEqual({ ok: true, value: 0 })
  })

  it('rejects a malformed or out-of-range time', () => {
    expect(parseStepperEntry('roundDuration', '0:00')).toEqual({ ok: false, error: 'duration' })
    expect(parseStepperEntry('roundDuration', '1:75')).toEqual({ ok: false, error: 'duration' })
    expect(parseStepperEntry('roundDuration', '1440:01')).toEqual({ ok: false, error: 'duration' })
    expect(parseStepperEntry('rest', 'abc')).toEqual({ ok: false, error: 'rest' })
    expect(parseStepperEntry('continuousDuration', '-5')).toEqual({ ok: false, error: 'duration' })
  })
})

describe('canStep', () => {
  it('disables the button at the limit only', () => {
    expect(canStep('roundCount', 1, -1)).toBe(false)
    expect(canStep('roundCount', 1, 1)).toBe(true)
    expect(canStep('roundCount', 99, 1)).toBe(false)
    expect(canStep('roundDuration', 1, -1)).toBe(false)
    expect(canStep('roundDuration', 15, -1)).toBe(true)
    expect(canStep('rest', 0, -1)).toBe(false)
    expect(canStep('rest', 0, 1)).toBe(true)
    expect(canStep('rest', 86_400, 1)).toBe(false)
    expect(canStep('continuousDuration', 86_400, 1)).toBe(false)
  })
})

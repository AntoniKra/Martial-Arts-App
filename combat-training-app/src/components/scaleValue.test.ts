import { describe, expect, it } from 'vitest'
import { scaleValueFromKey, scaleValueFromPosition, stepScaleValue } from './scaleValue'

describe('five-field scale selection', () => {
  it.each([1, 2, 3, 4, 5])('maps the center of field %s to its integer', (value) => {
    expect(scaleValueFromPosition(100 + (value - 0.5) * 50, 100, 250, 1, 5)).toBe(value)
  })
  it.each([[-50, 1], [100, 1], [149.9, 1], [150, 2], [299.9, 4], [300, 5], [350, 5], [900, 5]])('clamps or snaps position %s to %s', (position, value) => {
    expect(scaleValueFromPosition(position, 100, 250, 1, 5)).toBe(value)
  })
  it.each([0, -1, NaN, Infinity])('does not select a value for invalid width %s', (width) => {
    expect(scaleValueFromPosition(50, 0, width, 1, 5)).toBeNull()
  })
  it('rejects invalid coordinates', () => {
    expect(scaleValueFromPosition(NaN, 0, 250, 1, 5)).toBeNull()
    expect(scaleValueFromPosition(50, Infinity, 250, 1, 5)).toBeNull()
  })
  it.each([-1, 1] as const)('selects the midpoint only after the first step %s', (step) => {
    expect(stepScaleValue(null, step, 1, 5)).toBe(3)
  })
  it.each([[1, -1, 1], [5, 1, 5], [3, -1, 2], [3, 1, 4]] as const)('steps %s by %s within 1-5', (value, step, next) => {
    expect(stepScaleValue(value, step, 1, 5)).toBe(next)
  })
  it.each([['ArrowLeft', 2], ['ArrowDown', 2], ['ArrowRight', 4], ['ArrowUp', 4], ['Home', 1], ['End', 5]] as const)('supports key %s', (key, next) => {
    expect(scaleValueFromKey(3, key, 1, 5)).toBe(next)
  })
  it('preserves the empty state for unrelated keys', () => {
    expect(scaleValueFromKey(null, 'Tab', 1, 5)).toBeNull()
    expect(scaleValueFromKey(null, 'ArrowRight', 1, 5)).toBe(3)
    expect(scaleValueFromKey(null, 'Home', 1, 5)).toBe(1)
    expect(scaleValueFromKey(null, 'End', 1, 5)).toBe(5)
  })
})

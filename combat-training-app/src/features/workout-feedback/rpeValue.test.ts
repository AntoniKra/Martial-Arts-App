import { describe, expect, it } from 'vitest'
import { rpeValueFromKey, rpeValueFromPosition, stepRpeValue } from './rpeValue'

describe('RPE value selection', () => {
  it.each(Array.from({ length: 11 }, (_, value) => [value, 100 + (value + 0.5) * 30]))('maps the center of field %s to its integer', (value, position) => {
    expect(rpeValueFromPosition(position, 100, 330)).toBe(value)
  })
  it.each([[-50, 0], [100, 0], [129.9, 0], [130, 1], [429.9, 10], [430, 10], [900, 10]])('clamps or snaps position %s to %s', (position, value) => {
    expect(rpeValueFromPosition(position, 100, 330)).toBe(value)
  })
  it.each([0, -1, NaN, Infinity])('does not select a value for invalid width %s', (width) => {
    expect(rpeValueFromPosition(50, 0, width)).toBeNull()
  })
  it('does not select a value from invalid coordinates', () => {
    expect(rpeValueFromPosition(NaN, 0, 330)).toBeNull()
    expect(rpeValueFromPosition(50, Infinity, 330)).toBeNull()
  })
  it.each([-1, 1] as const)('starts an unselected value at five for step %s', (step) => {
    expect(stepRpeValue(null, step)).toBe(5)
  })
  it.each([[0, -1, 0], [10, 1, 10], [5, -1, 4], [5, 1, 6]] as const)('steps %s by %s within the scale', (value, step, next) => {
    expect(stepRpeValue(value, step)).toBe(next)
  })
  it.each([['ArrowLeft', 4], ['ArrowDown', 4], ['ArrowRight', 6], ['ArrowUp', 6], ['Home', 0], ['End', 10]] as const)('supports key %s', (key, next) => {
    expect(rpeValueFromKey(5, key)).toBe(next)
  })
  it('leaves an empty selection untouched for unrelated keys', () => {
    expect(rpeValueFromKey(null, 'Tab')).toBeNull()
    expect(rpeValueFromKey(null, 'ArrowRight')).toBe(5)
    expect(rpeValueFromKey(null, 'Home')).toBe(0)
    expect(rpeValueFromKey(null, 'End')).toBe(10)
  })
})

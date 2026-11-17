import { describe, expect, it } from 'vitest'
import { screenBackTarget } from './screenBackTarget'

describe('screen back navigation', () => {
  it('returns to the preceding application entry, including after a reload', () => {
    expect(screenBackTarget({ idx: 1, key: 'app-entry' }, '/profile')).toBe(-1)
    expect(screenBackTarget({ idx: 12 }, '/workouts')).toBe(-1)
  })
  it.each([null, undefined, {}, { idx: 0 }, { idx: -1 }, { idx: '2' }, { idx: 1.5 }, { idx: Infinity }])('uses the parent for direct or invalid history: %j', (state) => {
    expect(screenBackTarget(state, '/progress')).toBe('/progress')
  })
})

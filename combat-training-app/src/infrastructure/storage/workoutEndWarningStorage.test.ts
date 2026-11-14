import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { persistWorkoutEndWarnings, readStoredWorkoutEndWarnings, WORKOUT_END_WARNING_STORAGE_KEY } from './workoutEndWarningStorage'
import { DEFAULT_WORKOUT_END_WARNINGS, ROUND_WARNING_VALUES, REST_WARNING_VALUES } from '@/domain/workout-playback/workoutEndWarning'

beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: vi.fn(() => null), setItem: vi.fn() })
  persistWorkoutEndWarnings(DEFAULT_WORKOUT_END_WARNINGS)
  vi.mocked(localStorage.setItem).mockClear()
})
afterEach(() => vi.unstubAllGlobals())

describe('workout end warning preferences', () => {
  for (const round of ROUND_WARNING_VALUES) for (const rest of REST_WARNING_VALUES) {
    it(`persists and validates round=${round}, rest=${rest}`, () => {
      const value = { round, rest }
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(value))
      expect(readStoredWorkoutEndWarnings()).toEqual(value)
      expect(persistWorkoutEndWarnings(value)).toEqual(value)
      expect(localStorage.setItem).toHaveBeenCalledWith(WORKOUT_END_WARNING_STORAGE_KEY, JSON.stringify(value))
    })
  }
  it.each(['', 'null', '{}', '[]', 'true', '{', '{"round":"20","rest":"5"}', '{"round":"5","rest":"30"}', '{"round":10,"rest":5}'])(
    'defaults corrupted storage %s', (stored) => {
      vi.mocked(localStorage.getItem).mockReturnValue(stored)
      expect(readStoredWorkoutEndWarnings()).toEqual(DEFAULT_WORKOUT_END_WARNINGS)
    })
  it.each([null, 'true', 'false', 'broken'])('migrates the legacy switch %s and keeps rests disabled', (legacy) => {
    vi.mocked(localStorage.getItem).mockImplementation((key) => key === 'combat-training.endWarningEnabled' ? legacy : null)
    expect(readStoredWorkoutEndWarnings()).toEqual({ round: legacy === 'false' ? 'off' : '10', rest: 'off' })
  })
  it('prefers new settings to the legacy switch', () => {
    vi.mocked(localStorage.getItem).mockImplementation((key) => key === WORKOUT_END_WARNING_STORAGE_KEY ? '{"round":"30","rest":"5"}' : 'false')
    expect(readStoredWorkoutEndWarnings()).toEqual({ round: '30', rest: '5' })
  })
  it('keeps settings and the player consistent after failed writes, then recovers', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('{"round":"off","rest":"10"}')
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error('Quota exceeded') })
    expect(persistWorkoutEndWarnings({ round: '5', rest: '5' })).toEqual(DEFAULT_WORKOUT_END_WARNINGS)
    expect(readStoredWorkoutEndWarnings()).toEqual(DEFAULT_WORKOUT_END_WARNINGS)
    vi.mocked(localStorage.setItem).mockImplementation(() => {})
    expect(persistWorkoutEndWarnings({ round: 'off', rest: '10' })).toEqual({ round: 'off', rest: '10' })
    expect(readStoredWorkoutEndWarnings()).toEqual({ round: 'off', rest: '10' })
  })
  it('defaults when the storage getter throws or the API is unavailable', () => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Access denied') } })
    expect(readStoredWorkoutEndWarnings()).toEqual(DEFAULT_WORKOUT_END_WARNINGS)
    expect(persistWorkoutEndWarnings({ round: 'off', rest: '5' })).toEqual(DEFAULT_WORKOUT_END_WARNINGS)
  })
})

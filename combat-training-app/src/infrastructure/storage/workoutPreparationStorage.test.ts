import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { persistWorkoutPreparation, readStoredWorkoutPreparation, WORKOUT_PREPARATION_STORAGE_KEY } from './workoutPreparationStorage'

beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: vi.fn(() => null), setItem: vi.fn() })
  persistWorkoutPreparation('10')
  vi.mocked(localStorage.setItem).mockClear()
})
afterEach(() => vi.unstubAllGlobals())

describe('workout preparation preference', () => {
  it.each(['5', '10', '15', '30'] as const)('reads and persists %s seconds', (value) => {
    vi.mocked(localStorage.getItem).mockReturnValue(value)
    expect(readStoredWorkoutPreparation()).toBe(value)
    expect(localStorage.getItem).toHaveBeenCalledWith(WORKOUT_PREPARATION_STORAGE_KEY)
    expect(persistWorkoutPreparation(value)).toBe(value)
    expect(localStorage.setItem).toHaveBeenCalledWith(WORKOUT_PREPARATION_STORAGE_KEY, value)
  })

  it.each([null, '', '0', '1', '60', '010', '10.0', '{}', '[10]', ' 10 ', 'NaN'])('defaults to ten seconds for invalid storage %s', (value) => {
    vi.mocked(localStorage.getItem).mockReturnValue(value)
    expect(readStoredWorkoutPreparation()).toBe('10')
  })

  it('defaults on failed reads and writes without throwing', () => {
    vi.mocked(localStorage.getItem).mockImplementation(() => { throw new Error('Storage blocked') })
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error('Quota exceeded') })
    expect(readStoredWorkoutPreparation()).toBe('10')
    expect(persistWorkoutPreparation('30')).toBe('10')
  })

  it('keeps ten seconds after a failed write over an old preference until a successful selection', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('30')
    expect(readStoredWorkoutPreparation()).toBe('30')
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error('Quota exceeded') })
    expect(persistWorkoutPreparation('5')).toBe('10')
    expect(readStoredWorkoutPreparation()).toBe('10')
    vi.mocked(localStorage.setItem).mockImplementation(() => {})
    vi.mocked(localStorage.getItem).mockReturnValue('15')
    expect(persistWorkoutPreparation('15')).toBe('15')
    expect(readStoredWorkoutPreparation()).toBe('15')
  })

  it('defaults when accessing the storage property itself throws', () => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Access denied') } })
    expect(readStoredWorkoutPreparation()).toBe('10')
    expect(persistWorkoutPreparation('5')).toBe('10')
  })
})

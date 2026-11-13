import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { persistWorkoutEndWarning, readStoredWorkoutEndWarning, WORKOUT_END_WARNING_STORAGE_KEY } from './workoutEndWarningStorage'

beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: vi.fn(() => null), setItem: vi.fn() })
  persistWorkoutEndWarning(true)
  vi.mocked(localStorage.setItem).mockClear()
})
afterEach(() => vi.unstubAllGlobals())

describe('workout end warning preference', () => {
  it.each([true, false])('persists and reads enabled=%s', (enabled) => {
    vi.mocked(localStorage.getItem).mockReturnValue(String(enabled))
    expect(readStoredWorkoutEndWarning()).toBe(enabled)
    expect(localStorage.getItem).toHaveBeenCalledWith(WORKOUT_END_WARNING_STORAGE_KEY)
    expect(persistWorkoutEndWarning(enabled)).toBe(enabled)
    expect(localStorage.setItem).toHaveBeenCalledWith(WORKOUT_END_WARNING_STORAGE_KEY, String(enabled))
  })

  it.each([null, '', '0', '1', 'False', 'TRUE', 'null', '{}', '[]', ' false '])('defaults to enabled for invalid storage %s', (value) => {
    vi.mocked(localStorage.getItem).mockReturnValue(value)
    expect(readStoredWorkoutEndWarning()).toBe(true)
  })

  it('defaults to enabled when reads and writes throw', () => {
    vi.mocked(localStorage.getItem).mockImplementation(() => { throw new Error('Storage blocked') })
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error('Quota exceeded') })
    expect(readStoredWorkoutEndWarning()).toBe(true)
    expect(persistWorkoutEndWarning(false)).toBe(true)
  })

  it('keeps the setting and player consistent after a failed write until a successful selection', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('false')
    expect(readStoredWorkoutEndWarning()).toBe(false)
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error('Quota exceeded') })
    expect(persistWorkoutEndWarning(true)).toBe(true)
    expect(readStoredWorkoutEndWarning()).toBe(true)
    vi.mocked(localStorage.setItem).mockImplementation(() => {})
    expect(persistWorkoutEndWarning(false)).toBe(false)
    expect(readStoredWorkoutEndWarning()).toBe(false)
  })

  it('defaults when access to the storage property itself throws', () => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Access denied') } })
    expect(readStoredWorkoutEndWarning()).toBe(true)
    expect(persistWorkoutEndWarning(false)).toBe(true)
  })
})

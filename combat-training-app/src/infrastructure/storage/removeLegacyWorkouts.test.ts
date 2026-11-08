import { afterEach, expect, it, vi } from 'vitest'
import { removeLegacyWorkouts } from './removeLegacyWorkouts'

afterEach(() => vi.unstubAllGlobals())

it('discards only the two demo collections once and leaves theme preferences intact', () => {
  const values = new Map([['combat-training.workout-plans', 'old plans'], ['combat-training.workout-sessions', 'old sessions'], ['theme', 'light']])
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
  removeLegacyWorkouts(storage)
  expect([...values]).toEqual([['theme', 'light'], ['combat-training.firestore-migration', '1']])
  values.set('combat-training.workout-plans', 'sentinel')
  removeLegacyWorkouts(storage)
  expect(values.get('combat-training.workout-plans')).toBe('sentinel')
})

it.each(['getItem', 'removeItem', 'setItem'] as const)('ignores a blocked storage %s operation', (operation) => {
  const storage = { getItem: vi.fn(() => null), removeItem: vi.fn(), setItem: vi.fn() }
  storage[operation].mockImplementation(() => { throw new Error('Storage access denied') })
  expect(() => removeLegacyWorkouts(storage)).not.toThrow()
  expect(storage[operation]).toHaveBeenCalledOnce()
})

it('ignores an exception from the window.localStorage getter', () => {
  const getStorage = vi.fn(() => { throw new Error('Storage access denied') })
  vi.stubGlobal('window', Object.defineProperty({}, 'localStorage', { get: getStorage }))
  expect(() => removeLegacyWorkouts()).not.toThrow()
  expect(getStorage).toHaveBeenCalledOnce()
})

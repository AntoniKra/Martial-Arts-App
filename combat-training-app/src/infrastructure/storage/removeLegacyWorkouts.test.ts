import { expect, it } from 'vitest'
import { removeLegacyWorkouts } from './removeLegacyWorkouts'

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

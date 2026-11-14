import { afterEach, expect, it, vi } from 'vitest'
import { createMemoryStorage } from '@/test/memoryStorage'
import { wellbeingDismissalStorage } from './wellbeingDismissalStorage'

afterEach(() => vi.unstubAllGlobals())
it('remembers only the chosen date, isolates users and rejects malformed storage', () => {
  const storage = createMemoryStorage(); vi.stubGlobal('localStorage', storage)
  const first = wellbeingDismissalStorage('first')
  first.dismiss('2026-11-14')
  expect(first.dismissed('2026-11-14')).toBe(true)
  expect(first.dismissed('2026-11-15')).toBe(false)
  expect(wellbeingDismissalStorage('other').dismissed('2026-11-14')).toBe(false)
  for (const value of ['broken', '{}', '{"schemaVersion":2,"date":"2026-11-14"}', '{"schemaVersion":1,"date":"2026-02-30"}']) {
    storage.setItem('combat-training.wellbeingDismissal.first', value)
    expect(first.dismissed('2026-11-14')).toBe(false)
  }
})
it('handles disabled storage and validates before writing', () => {
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Unavailable') }, setItem: () => { throw new Error('Unavailable') } })
  expect(wellbeingDismissalStorage('a').dismissed('2026-11-14')).toBe(false)
  expect(() => wellbeingDismissalStorage('a').dismiss('2026-11-14')).not.toThrow()
  expect(() => wellbeingDismissalStorage('a').dismiss('invalid')).toThrow()
})

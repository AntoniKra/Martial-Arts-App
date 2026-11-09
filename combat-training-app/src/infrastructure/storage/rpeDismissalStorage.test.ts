import { afterEach, expect, it, vi } from 'vitest'
import { createRpeDismissalStorage } from './rpeDismissalStorage'

afterEach(() => vi.unstubAllGlobals())

it('validates persisted dismissals, isolates accounts, and keeps earlier dismissals', () => {
  const items = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value) })
  const first = createRpeDismissalStorage('first')
  first.dismiss('one')
  first.dismiss('two')
  first.dismiss('one')
  expect(first.read()).toEqual(['one', 'two'])
  expect(createRpeDismissalStorage('second').read()).toEqual([])
  for (const invalid of ['broken', '{}', '[1]', '{"schemaVersion":2,"sessionIds":["one"]}', '{"schemaVersion":1,"sessionIds":[""]}']) {
    items.set('combat-training.rpeDismissals.first', invalid)
    expect(first.read()).toEqual([])
  }
})

it('handles unavailable storage and refuses invalid writes', () => {
  const setItem = vi.fn(() => { throw new Error('Unavailable') })
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Unavailable') }, setItem })
  const storage = createRpeDismissalStorage('athlete')
  expect(storage.read()).toEqual([])
  expect(storage.dismiss('')).toBe(false)
  expect(setItem).not.toHaveBeenCalled()
  expect(storage.dismiss('one')).toBe(false)
})

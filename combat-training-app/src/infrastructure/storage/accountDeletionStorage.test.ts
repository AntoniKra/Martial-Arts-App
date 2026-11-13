import { describe, expect, it } from 'vitest'
import { clearAccountLocalStorage, markDeletionRedirect, resumeDeletionRedirect } from './accountDeletionStorage'

function storage() {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) }, clear: () => values.clear(),
  } satisfies Storage
}
describe('account deletion storage', () => {
  it('removes all matching account keys including a future quick timer, preserving other accounts and device settings', () => {
    const store = storage()
    for (const key of ['combat-training.activeWorkout.athlete', 'combat-training.rpeDismissals.athlete', 'combat-training.quickTimer.athlete',
      'combat-training.quickTimer.other', 'combat-training.theme', 'combat-training.preparation', 'foreign.athlete']) store.setItem(key, 'value')
    clearAccountLocalStorage('athlete', store)
    expect(Array.from({ length: store.length }, (_, index) => store.key(index))).toEqual([
      'combat-training.quickTimer.other', 'combat-training.theme', 'combat-training.preparation', 'foreign.athlete',
    ])
  })
  it.each([
    ['athlete', 'reauthenticate', true], ['other', 'reauthenticate', false],
    ['athlete', 'signIn', false], ['athlete', null, false],
  ])('resumes only a matching uid and actual reauthentication (%s, %s)', (uid, operation, expected) => {
    const store = storage()
    markDeletionRedirect('athlete', store)
    expect(resumeDeletionRedirect(uid, operation, store)).toBe(expected)
    expect(store.length).toBe(0)
    expect(resumeDeletionRedirect(uid, operation, store)).toBe(false)
  })
  it.each(['broken', '{"uid":"athlete","step":"delete-now"}', 'null'])('discards a malformed marker %s', (raw) => {
    const store = storage()
    store.setItem('combat-training.accountDeletionRedirect', raw)
    expect(resumeDeletionRedirect('athlete', 'reauthenticate', store)).toBe(false)
    expect(store.length).toBe(0)
  })
})

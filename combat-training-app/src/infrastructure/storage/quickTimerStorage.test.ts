import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { defaultQuickTimerDraft } from '@/domain/quick-timer/quickTimer'
import { quickTimerConfig } from '@/test/quickTimerBuilders'
import { createQuickTimerStorage } from './quickTimerStorage'

beforeEach(() => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) } })
})
afterEach(() => vi.unstubAllGlobals())
it('uses empty selections by default and saves valid preferences separately for each account', () => {
  const storage = createQuickTimerStorage('owner')
  expect(storage.read()).toEqual(defaultQuickTimerDraft())
  storage.save(quickTimerConfig({ category: 'sparring', format: 'custom', roundCount: 50 }))
  expect(storage.read()).toMatchObject({ category: 'sparring', format: 'custom', roundCount: 50 })
  expect(JSON.parse(localStorage.getItem('combat-training.quickTimer.owner') ?? 'null')).toHaveProperty('schemaVersion', 1)
  expect(createQuickTimerStorage('other').read()).toEqual(defaultQuickTimerDraft())
})
it.each(['broken', 'null', '{}', JSON.stringify({ schemaVersion: 2, ...quickTimerConfig() }), JSON.stringify({ schemaVersion: 1, ...quickTimerConfig({ roundCount: 51 }) })])('falls back after a corrupt read: %s', (raw) => {
  localStorage.setItem('combat-training.quickTimer.owner', raw)
  expect(createQuickTimerStorage('owner').read()).toEqual(defaultQuickTimerDraft())
})
it('tolerates blocked reads and failed writes', () => {
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Blocked') }, setItem: () => { throw new Error('Full') } })
  expect(createQuickTimerStorage('owner').read()).toEqual(defaultQuickTimerDraft())
  expect(() => createQuickTimerStorage('owner').save(quickTimerConfig())).not.toThrow()
})

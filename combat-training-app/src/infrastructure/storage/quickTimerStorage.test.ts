import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { defaultQuickTimerDraft } from '@/domain/quick-timer/quickTimer'
import { quickTimerConfig } from '@/test/quickTimerBuilders'
import { createQuickTimerStorage } from './quickTimerStorage'

const { disciplineKey: _disciplineKey, ...defaultStoredDraft } = defaultQuickTimerDraft()

beforeEach(() => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) } })
})
afterEach(() => vi.unstubAllGlobals())
it('uses empty selections by default and saves valid preferences separately for each account', () => {
  const storage = createQuickTimerStorage('owner')
  expect(storage.read()).toEqual(defaultStoredDraft)
  const config = quickTimerConfig({ category: 'sparring', disciplineKey: 'muay_thai', format: 'custom', roundCount: 50 })
  storage.save(config)
  expect(storage.read()).toMatchObject({ category: 'sparring', format: 'custom', roundCount: 50 })
  const saved = JSON.parse(localStorage.getItem('combat-training.quickTimer.owner') ?? 'null')
  expect(saved).toHaveProperty('schemaVersion', 1)
  expect(saved).not.toHaveProperty('disciplineKey')
  expect(createQuickTimerStorage('other').read()).toEqual(defaultStoredDraft)
})
it('strips the legacy discipline while retaining the saved timing', () => {
  const config = quickTimerConfig({ format: 'custom', roundCount: 7, roundDurationSeconds: 90, restBetweenRoundsSeconds: 30 })
  localStorage.setItem('combat-training.quickTimer.owner', JSON.stringify({ schemaVersion: 1, ...config, disciplineKey: 'boxing' }))
  const draft = createQuickTimerStorage('owner').read()
  expect(draft).toMatchObject({ format: 'custom', roundCount: 7, roundDurationSeconds: 90, restBetweenRoundsSeconds: 30 })
  expect(draft).not.toHaveProperty('disciplineKey')
})
it.each(['broken', 'null', '{}', JSON.stringify({ schemaVersion: 2, ...quickTimerConfig() }), JSON.stringify({ schemaVersion: 1, ...quickTimerConfig({ roundCount: 51 }) })])('falls back after a corrupt read: %s', (raw) => {
  localStorage.setItem('combat-training.quickTimer.owner', raw)
  expect(createQuickTimerStorage('owner').read()).toEqual(defaultStoredDraft)
})
it('tolerates blocked reads and failed writes', () => {
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Blocked') }, setItem: () => { throw new Error('Full') } })
  expect(createQuickTimerStorage('owner').read()).toEqual(defaultStoredDraft)
  expect(() => createQuickTimerStorage('owner').save(quickTimerConfig())).not.toThrow()
})

import { describe, expect, it } from 'vitest'
import { weekPlanDocumentSchema } from './weekPlanDocumentSchema'

const item = { id: 'one', kind: 'plan', workoutPlanId: 'bag', planNameSnapshot: 'Worek' }
const document = { schemaVersion: 1, weekStart: '2026-11-09', items: [item],
  createdAt: '2026-11-09T10:00:00.000Z', updatedAt: '2026-11-09T10:00:00.000Z', editedAfterWeekEnd: false }

describe('week plan document schema', () => {
  it('accepts both item variants, duplicates of a plan, and empty or bounded lists', () => {
    for (const items of [[], [{ id: 'category', kind: 'category', category: 'mixed' }],
      Array.from({ length: 14 }, (_, index) => ({ ...item, id: String(index) }))]) {
      expect(weekPlanDocumentSchema.safeParse({ ...document, items }).success).toBe(true)
    }
  })
  it.each([
    { schemaVersion: 2 }, { id: 'not-a-field' }, { weekStart: '2026-11-10' }, { weekStart: '2026-02-30' },
    { weekStart: '2026-13-01' }, { weekStart: '09.11.2026' }, { weekStart: null },
    { createdAt: '2026-11-09' }, { updatedAt: '2026-11-09T10:00:00+01:00' },
    { editedAfterWeekEnd: 'true' }, { editedAfterWeekEnd: null }, { items: {} },
    { items: Array.from({ length: 15 }, (_, index) => ({ ...item, id: String(index) })) },
    { items: [item, item] }, { items: [{ ...item, id: '' }] }, { items: [{ ...item, id: 'bad/id' }] },
    { items: [{ ...item, workoutPlanId: '' }] }, { items: [{ ...item, workoutPlanId: 'bad/id' }] },
    { items: [{ ...item, planNameSnapshot: '' }] }, { items: [{ ...item, extra: true }] },
    { items: [{ id: 'a', kind: 'category', category: 'warmup' }] },
    { items: [{ id: 'a', kind: 'category', category: 'cooldown' }] },
    { items: [{ id: 'a', kind: 'category', category: 'anything' }] },
    { items: [{ id: 'a', kind: 'category', category: 'bag', workoutPlanId: 'bag' }] },
    { items: [{ id: 'a', kind: 'unknown' }] },
  ])('rejects malformed external data %j', (fields) => expect(weekPlanDocumentSchema.safeParse({ ...document, ...fields }).success).toBe(false))
  it.each(Object.keys(document))('requires %s', (key) => {
    const incomplete: Record<string, unknown> = { ...document }
    delete incomplete[key]
    expect(weekPlanDocumentSchema.safeParse(incomplete).success).toBe(false)
  })
})

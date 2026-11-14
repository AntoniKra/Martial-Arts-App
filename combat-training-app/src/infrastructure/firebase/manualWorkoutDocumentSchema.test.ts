import { describe, expect, it } from 'vitest'
import { workoutSessionDocumentSchema } from './workoutDocumentSchemas'

const instant = '2026-11-12T12:00:00.000Z'
const rating = { workoutItemId: null, focusSkillId: 'guard', skillNameSnapshot: 'Guard', criterionSnapshot: 'Chin',
  blockType: 'bag', assessment: 4, correction: null, previousCorrectionCheck: null }
const entry = { schemaVersion: 1, id: 'manual', source: 'manual', status: 'completed', disciplineKey: 'boxing',
  category: 'sparring', workoutDate: '2026-11-08', timezone: 'Europe/Warsaw', durationSeconds: 5400,
  workSeconds: null, sparringSeconds: null, completion: null, note: null, rpe: 0, rpeRecordedAt: instant,
  sparring: [{ blockId: null, intensity: 'hard', rounds: 6 }], focusRatings: [], createdAt: instant, updatedAt: instant }

describe('manual workout document schema', () => {
  const multi = { ...entry, schemaVersion: 2, category: 'mixed', parts: ['technique', 'pads', 'sparring'] }
  it('accepts v2 parts and keeps legacy single and mixed entries unchanged', () => {
    expect(workoutSessionDocumentSchema.parse(multi)).toEqual(multi)
    expect(workoutSessionDocumentSchema.parse({ ...entry, category: 'mixed' })).toEqual({ ...entry, category: 'mixed' })
    expect(workoutSessionDocumentSchema.parse({ ...multi, parts: ['other'], sparring: [] })).toMatchObject({ parts: ['other'] })
  })
  it.each([[], ['bag', 'bag'], ['unknown'], ['technique', 'pads', 'bag', 'sparring', 'conditioning', 'other', 'bag'], undefined, null, 'pads']
    .map((parts) => ({ parts })))('rejects invalid v2 parts %j', ({ parts }) => {
    expect(workoutSessionDocumentSchema.safeParse({ ...multi, parts }).success).toBe(false)
  })
  it('rejects a version mismatch, mismatched category and sparring data inconsistent with parts', () => {
    for (const patch of [{ schemaVersion: 1 }, { schemaVersion: 3 }, { category: 'bag' }, { sparring: [] }, { parts: ['pads'] }]) {
      expect(workoutSessionDocumentSchema.safeParse({ ...multi, ...patch }).success).toBe(false)
    }
  })
  it('accepts required RPE zero, unknown times, and zero or three unique focus ratings', () => {
    expect(workoutSessionDocumentSchema.parse(entry)).toEqual(entry)
    expect(workoutSessionDocumentSchema.safeParse({ ...entry, durationSeconds: 60,
      focusRatings: [rating, { ...rating, focusSkillId: 'two', assessment: 'unableToRate' }, { ...rating, focusSkillId: 'three' }] }).success).toBe(true)
    expect(workoutSessionDocumentSchema.safeParse({ ...entry, category: 'bag', durationSeconds: 28800, sparring: [] }).success).toBe(true)
  })
  it.each([
    { focusRatings: undefined }, { focusRatings: [rating, rating] },
    { focusRatings: Array.from({ length: 4 }, (_, i) => ({ ...rating, focusSkillId: String(i) })) },
    ...[{ assessment: null }, { assessment: 0 }, { assessment: 6 }, { assessment: 1.5 },
      { workoutItemId: 'plan-item' }, { blockType: 'warmup' }, { blockType: 'cooldown' },
      { correction: { problem: '', fix: 'Fix' } }].map((patch) => ({ focusRatings: [{ ...rating, ...patch }] })),
    { rpe: null }, { rpeRecordedAt: null }, { rpe: 1.5 }, { rpe: 11 }, { workSeconds: 0 }, { sparringSeconds: 0 },
    ...[30, 28801, 60.5].map((durationSeconds) => ({ durationSeconds })),
    { sparring: [] }, { sparring: [entry.sparring[0], entry.sparring[0]] },
    ...[{ blockId: 'block' }, { intensity: null }, { rounds: 0 }, { rounds: 51 }, { rounds: 1.5 }]
      .map((patch) => ({ sparring: [{ ...entry.sparring[0], ...patch }] })),
    { exerciseRatings: [] }, { startedAt: instant },
  ])('rejects invalid manual fields %j', (patch) => {
    expect(workoutSessionDocumentSchema.safeParse({ ...entry, ...patch }).success).toBe(false)
  })
})

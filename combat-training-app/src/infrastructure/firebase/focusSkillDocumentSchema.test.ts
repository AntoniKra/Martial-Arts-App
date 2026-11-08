import { describe, expect, it } from 'vitest'
import { focusSkillDocumentSchema } from './focusSkillDocumentSchema'

const skill = {
  schemaVersion: 1,
  id: '21a507bc-7f90-4b9f-a890-2ba3a53ee67a',
  name: 'Guard return',
  criterion: 'Hand returns to the chin before the next punch',
  openCorrection: null,
  archivedAt: null,
  createdAt: '2026-11-08T09:00:00.000Z',
  updatedAt: '2026-11-08T09:00:00.000Z',
}

describe('focus skill document schema', () => {
  it('accepts a complete reusable focus skill without a correction or archive date', () => {
    expect(focusSkillDocumentSchema.parse(skill)).toEqual(skill)
  })

  it.each([
    ['name', ''], ['name', 'n'.repeat(81)], ['name', 42],
    ['criterion', ''], ['criterion', 'c'.repeat(201)], ['criterion', null],
    ['id', ''], ['id', 'bad/id'],
  ])('rejects invalid %s (%j)', (field, value) => {
    expect(focusSkillDocumentSchema.safeParse({ ...skill, [field as string]: value }).success).toBe(false)
  })

  it('accepts the documented text length boundaries', () => {
    expect(focusSkillDocumentSchema.safeParse({ ...skill, name: 'n'.repeat(80), criterion: 'c'.repeat(200) }).success).toBe(true)
  })

  it('preserves an open correction and an archive timestamp', () => {
    const document = { ...skill, archivedAt: skill.updatedAt, openCorrection: {
      problem: 'Dropping guard', fix: 'Touch the chin', sessionId: 'session-one', workoutDate: '2026-11-08',
    } }
    expect(focusSkillDocumentSchema.parse(document)).toEqual(document)
  })

  it.each([
    { schemaVersion: 2 }, { schemaVersion: '1' }, { extra: true },
    { archivedAt: 'yesterday' }, { createdAt: '2026-11-08' }, { updatedAt: null },
    ...Object.keys(skill).map((field) => ({ [field]: undefined })),
    ...[
      {}, { problem: '', fix: 'Fix', sessionId: 'session', workoutDate: '2026-11-08' },
      { problem: 'p'.repeat(201), fix: 'Fix', sessionId: 'session', workoutDate: '2026-11-08' },
      { problem: 'Problem', fix: '', sessionId: 'session', workoutDate: '2026-11-08' },
      { problem: 'Problem', fix: 'f'.repeat(201), sessionId: 'session', workoutDate: '2026-11-08' },
      { problem: 'Problem', fix: 'Fix', sessionId: '', workoutDate: '2026-11-08' },
      { problem: 'Problem', fix: 'Fix', sessionId: 'session', workoutDate: '2026-02-30' },
      { problem: 'Problem', fix: 'Fix', sessionId: 'session', workoutDate: '2026-11-08', extra: true },
    ].map((openCorrection) => ({ openCorrection })),
  ])('rejects an invalid or incomplete document: %j', (patch) => {
    expect(focusSkillDocumentSchema.safeParse({ ...skill, ...patch }).success).toBe(false)
  })
})

import { expect, it } from 'vitest'
import { wellbeingDocumentSchema } from './wellbeingDocumentSchema'
import { parseProfileDocument, profileDocumentSchema } from './profileDocumentSchemas'

const instant = '2026-11-14T09:00:00.000Z'
const valid = { schemaVersion: 1, questionsVersion: 1, date: '2026-11-14', sleep: 1, energy: 5, soreness: 3, stress: 4, note: null, createdAt: instant, updatedAt: instant }
it('accepts exact fields and bounded notes', () => {
  expect(wellbeingDocumentSchema.safeParse(valid).success).toBe(true)
  expect(wellbeingDocumentSchema.safeParse({ ...valid, note: 'x'.repeat(300) }).success).toBe(true)
})
it.each([{ sleep: 0 }, { energy: 6 }, { soreness: 1.1 }, { stress: '3' }, { date: '2026-02-30' }, { questionsVersion: 2 }, { schemaVersion: 2 },
  { note: 'x'.repeat(301) }, { extra: true }, { createdAt: null }, { updatedAt: 'yesterday' }])('rejects invalid documents %j', (patch) => {
  expect(wellbeingDocumentSchema.safeParse({ ...valid, ...patch }).success).toBe(false)
})
it('requires every wellbeing field', () => {
  for (const field of Object.keys(valid)) expect(wellbeingDocumentSchema.safeParse(Object.fromEntries(Object.entries(valid).filter(([key]) => key !== field))).success).toBe(false)
})
it('reads old profiles and validates a separate optional consent', () => {
  const profile = { schemaVersion: 1, healthDataConsent: null, weightClassLabel: null, createdAt: instant, updatedAt: instant }
  expect(parseProfileDocument(profile).wellbeingConsent).toBeUndefined()
  expect(profileDocumentSchema.safeParse({ ...profile, wellbeingConsent: { grantedAt: instant, adultConfirmed: true, noticeVersion: '2026-11' } }).success).toBe(true)
  expect(profileDocumentSchema.safeParse({ ...profile, wellbeingConsent: { grantedAt: instant, adultConfirmed: false, noticeVersion: '2026-11' } }).success).toBe(false)
})

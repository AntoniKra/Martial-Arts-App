import { describe, expect, it } from 'vitest'
import { bodyWeightDocumentSchema, profileDocumentSchema } from './profileDocumentSchemas'

const instant = '2026-11-13T09:00:00.000Z'
const consent = { grantedAt: instant, noticeVersion: '2026-11', adultConfirmed: true }
const profile = { schemaVersion: 1, healthDataConsent: consent, weightClassLabel: null, createdAt: instant, updatedAt: instant }
const weight = { schemaVersion: 1, date: '2026-11-13', weightKg: 76.4, createdAt: instant, updatedAt: instant }

describe('profile document boundary', () => {
  it('accepts consent, an optional category and withdrawn consent', () => {
    expect(profileDocumentSchema.safeParse({ ...profile, weightClassLabel: '−77 kg' }).success).toBe(true)
    expect(profileDocumentSchema.safeParse({ ...profile, healthDataConsent: null }).success).toBe(true)
  })
  it.each([
    { healthDataConsent: { ...consent, adultConfirmed: false } },
    { healthDataConsent: { grantedAt: instant, noticeVersion: '2026-11' } },
    { healthDataConsent: { ...consent, extra: true } },
    { healthDataConsent: { ...consent, noticeVersion: 'November' } },
    { healthDataConsent: { ...consent, grantedAt: '2026-11-13' } },
    { healthDataConsent: null, weightClassLabel: '−77 kg' },
    { weightClassLabel: '' }, { weightClassLabel: 'x'.repeat(21) }, { extra: true },
    { schemaVersion: 2 }, { updatedAt: null },
  ])('rejects invalid profile fields %j', (patch) => {
    expect(profileDocumentSchema.safeParse({ ...profile, ...patch }).success).toBe(false)
  })
})

describe('body weight document boundary', () => {
  it.each([30, 250, 76.4, 30.1, 249.9])('accepts tenths including numeric boundaries: %s', (weightKg) => {
    expect(bodyWeightDocumentSchema.safeParse({ ...weight, weightKg }).success).toBe(true)
  })
  it.each([
    { weightKg: 29.9 }, { weightKg: 250.1 }, { weightKg: 76.44 }, { weightKg: '76.4' },
    { weightKg: NaN }, { date: '2026-02-30' }, { date: '13.11.2026' },
    { createdAt: '2026-11-13' }, { recordedAt: instant }, { schemaVersion: 2 },
  ])('rejects invalid measurement fields %j', (patch) => {
    expect(bodyWeightDocumentSchema.safeParse({ ...weight, ...patch }).success).toBe(false)
  })
})

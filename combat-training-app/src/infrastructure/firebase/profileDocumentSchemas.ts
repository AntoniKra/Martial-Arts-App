import * as z from 'zod/mini'
import { instantSchema } from './workoutDocumentSchemas'

const consent = z.strictObject({
  grantedAt: instantSchema,
  noticeVersion: z.string().check(z.regex(/^[0-9]{4}-[0-9]{2}$/)),
  adultConfirmed: z.literal(true),
})

export const profileDocumentSchema = z.strictObject({
  schemaVersion: z.literal(1), healthDataConsent: z.nullable(consent),
  weightClassLabel: z.nullable(z.string().check(z.minLength(1), z.maxLength(20))),
  createdAt: instantSchema, updatedAt: instantSchema,
}).check(z.refine((profile) => profile.healthDataConsent !== null || profile.weightClassLabel === null))

export const bodyWeightDocumentSchema = z.strictObject({
  schemaVersion: z.literal(1), date: z.iso.date(),
  weightKg: z.number().check(z.minimum(30), z.maximum(250),
    z.refine((value) => Math.abs(value * 10 - Math.round(value * 10)) < 1e-8)),
  createdAt: instantSchema, updatedAt: instantSchema,
})

export function parseProfileDocument(value: unknown) {
  const { schemaVersion: _version, ...profile } = profileDocumentSchema.parse(value)
  return profile
}

export function parseBodyWeightDocument(value: unknown) {
  const { schemaVersion: _version, ...weight } = bodyWeightDocumentSchema.parse(value)
  return weight
}

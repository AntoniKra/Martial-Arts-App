import * as z from 'zod/mini'
import { WELLBEING_NOTE_LIMIT } from '@/domain/wellbeing/wellbeing'
import { instantSchema } from './workoutDocumentSchemas'

const rating = z.number().check(z.int(), z.minimum(1), z.maximum(5))
export const wellbeingDocumentSchema = z.strictObject({
  schemaVersion: z.literal(1), questionsVersion: z.literal(1), date: z.iso.date(),
  sleep: rating, energy: rating, soreness: rating, stress: rating,
  note: z.nullable(z.string().check(z.maxLength(WELLBEING_NOTE_LIMIT))),
  createdAt: instantSchema, updatedAt: instantSchema,
})
export function parseWellbeingDocument(value: unknown) {
  const { schemaVersion: _version, ...entry } = wellbeingDocumentSchema.parse(value)
  return entry
}

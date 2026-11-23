import * as z from 'zod/mini'
import { EXERCISE_TYPES } from '@/domain/exercise/exercise'
import { instantSchema } from './workoutDocumentSchemas'

export const exerciseIdSchema = z.string().check(z.minLength(1), z.maxLength(128), z.refine((value) => !value.includes('/')))
const unique = (values: readonly string[]) => new Set(values).size === values.length
const positive = (max: number) => z.number().check(z.int(), z.minimum(1), z.maximum(max))

export const exerciseDocumentSchema = z.strictObject({
  schemaVersion: z.literal(1), id: exerciseIdSchema,
  namePl: z.string().check(z.minLength(1), z.maxLength(100), z.refine((name) => name.trim() === name && name.length > 0)),
  type: z.enum(EXERCISE_TYPES),
  disciplines: z.array(z.enum(['boxing', 'kickboxing', 'muay_thai', 'k1', 'mma_striking'])).check(z.minLength(1), z.maxLength(5), z.refine(unique)),
  blockTypes: z.array(z.enum(['warmup', 'technique', 'pads', 'bag', 'sparring', 'conditioning', 'strengthAndConditioning', 'cooldown'])).check(z.minLength(1), z.maxLength(8), z.refine(unique)),
  defaultConfiguration: z.discriminatedUnion('mode', [
    z.strictObject({ mode: z.literal('rounds'), roundCount: positive(99), roundDurationSeconds: positive(86400),
      restBetweenRoundsSeconds: z.number().check(z.int(), z.minimum(0), z.maximum(86400)) }),
    z.strictObject({ mode: z.literal('continuous'), durationSeconds: positive(86400) }),
  ]),
  copiedFromId: z.optional(exerciseIdSchema),
  archivedAt: z.nullable(instantSchema), favorite: z.boolean(), lastUsedAt: z.nullable(instantSchema),
  createdAt: instantSchema, updatedAt: instantSchema,
})

import * as z from 'zod/mini'

const id = z.string().check(z.minLength(1), z.refine((value) => !value.includes('/')))
export const weekPlanItemSchema = z.discriminatedUnion('kind', [
  z.strictObject({ id, kind: z.literal('plan'), workoutPlanId: id, planNameSnapshot: z.string().check(z.minLength(1)) }),
  z.strictObject({ id, kind: z.literal('category'), category: z.enum([
    'technique', 'pads', 'bag', 'sparring', 'conditioning', 'strengthAndConditioning', 'mixed',
  ]) }),
])
export const revisionSchema = z.number().check(z.int(), z.minimum(0), z.maximum(Number.MAX_SAFE_INTEGER))

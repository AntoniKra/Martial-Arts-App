import * as z from 'zod/mini'
import { instantSchema } from './workoutDocumentSchemas'
import { isMonday } from '@/domain/week-plan/weekCalendar'
import { WEEK_PLAN_ITEM_LIMIT } from '@/domain/week-plan/weekPlan.types'

const id = z.string().check(z.minLength(1), z.refine((value) => !value.includes('/')))
const item = z.discriminatedUnion('kind', [
  z.strictObject({ id, kind: z.literal('plan'), workoutPlanId: id, planNameSnapshot: z.string().check(z.minLength(1)) }),
  z.strictObject({ id, kind: z.literal('category'), category: z.enum([
    'technique', 'pads', 'bag', 'sparring', 'conditioning', 'strengthAndConditioning', 'mixed',
  ]) }),
])

export const weekPlanDocumentSchema = z.strictObject({
  schemaVersion: z.literal(1), weekStart: z.iso.date().check(z.refine(isMonday)),
  items: z.array(item).check(z.maxLength(WEEK_PLAN_ITEM_LIMIT)),
  createdAt: instantSchema, updatedAt: instantSchema, editedAfterWeekEnd: z.boolean(),
}).check(z.refine((plan) => new Set(plan.items.map((entry) => entry.id)).size === plan.items.length))

export function parseWeekPlanDocument(value: unknown) {
  const { schemaVersion: _version, ...plan } = weekPlanDocumentSchema.parse(value)
  return plan
}

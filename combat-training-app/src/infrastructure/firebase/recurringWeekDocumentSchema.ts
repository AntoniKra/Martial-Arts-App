import * as z from 'zod/mini'
import { instantSchema } from './workoutDocumentSchemas'
import { MANUAL_WORKOUT_PARTS } from '@/domain/workout-session/workoutSession.types'
import { WEEK_PLAN_ITEM_LIMIT } from '@/domain/week-plan/weekPlan.types'
import { revisionSchema, weekPlanItemSchema } from './weekPlanItemSchema'

const id = z.string().check(z.minLength(1), z.maxLength(128), z.refine((value) => !value.includes('/')))
const day = z.literal([0, 1, 2, 3, 4, 5, 6])
const time = z.string().check(z.regex(/^([01]\d|2[0-3]):[0-5]\d$/))
const clubFields = {
  id, kind: z.literal('club'), day, disciplineKey: z.enum(['boxing', 'kickboxing', 'muay_thai', 'k1', 'mma_striking']),
  startTime: time, endTime: time, parts: z.array(z.enum(MANUAL_WORKOUT_PARTS)).check(z.maxLength(6), z.refine((parts) => new Set(parts).size === parts.length)),
  clubName: z.nullable(z.string().check(z.minLength(1), z.maxLength(100))),
}
const ownFields = {
  id, kind: z.literal('own'), day: z.nullable(day), category: z.enum(['technique', 'pads', 'bag', 'sparring', 'conditioning', 'strengthAndConditioning', 'mixed']),
  workoutPlanId: z.nullable(id), planNameSnapshot: z.nullable(z.string().check(z.minLength(1), z.maxLength(200))),
}
const restFields = { id, kind: z.literal('rest'), day }
const activity = z.discriminatedUnion('kind', [z.strictObject(clubFields), z.strictObject(ownFields), z.strictObject(restFields)])
const scheduled = z.discriminatedUnion('kind', [
  z.strictObject({ ...clubFields, omitted: z.boolean() }), z.strictObject({ ...ownFields, omitted: z.boolean(), legacyGoal: z.optional(weekPlanItemSchema) }),
  z.strictObject({ ...restFields, omitted: z.literal(false) }),
])
function validActivity(item: z.infer<typeof activity>) {
  return item.kind === 'club' ? item.startTime < item.endTime : item.kind !== 'own' || (item.workoutPlanId === null) === (item.planNameSnapshot === null)
}
export const weekActivitySchema = activity.check(z.refine(validActivity))
export const scheduledWeekItemSchema = scheduled.check(z.refine(validActivity))
export const recurringWeekDocumentSchema = z.strictObject({
  revision: z.optional(revisionSchema),
  schemaVersion: z.literal(1), id: z.literal('default'),
  items: z.array(weekActivitySchema).check(z.maxLength(WEEK_PLAN_ITEM_LIMIT), z.refine((items) => new Set(items.map((item) => item.id)).size === items.length)),
  createdAt: instantSchema, updatedAt: instantSchema,
})
export function parseRecurringWeekDocument(value: unknown) {
  const { schemaVersion: _version, ...week } = recurringWeekDocumentSchema.parse(value)
  return week
}

const header = z.strictObject({ schemaVersion: z.literal(1), id: z.literal('default'),
  revision: z.optional(revisionSchema),
  itemCount: z.number().check(z.int(), z.minimum(0), z.maximum(14)), createdAt: instantSchema, updatedAt: instantSchema })
const entry = z.strictObject({ schemaVersion: z.literal(1), id, position: z.number().check(z.int(), z.minimum(0), z.maximum(13)),
  activity: weekActivitySchema, createdAt: instantSchema, updatedAt: instantSchema,
}).check(z.refine((value) => value.id === `item-${value.position}`))
export const recurringWeekRecordSchema = z.union([header, entry])
export type RecurringWeekRecord = z.infer<typeof recurringWeekRecordSchema>

export function recurringWeekRecords(week: import('@/domain/week-plan/weekPlan.types').RecurringWeek): RecurringWeekRecord[] {
  recurringWeekDocumentSchema.parse({ ...week, schemaVersion: 1 })
  return [{ schemaVersion: 1, id: 'default', itemCount: week.items.length, createdAt: week.createdAt, updatedAt: week.updatedAt,
    ...(week.revision === undefined ? {} : { revision: week.revision }) },
    ...week.items.map((activity, position) => ({ schemaVersion: 1 as const, id: `item-${position}`, position, activity, createdAt: week.createdAt, updatedAt: week.updatedAt }))]
}

export function combineRecurringWeekRecords(records: readonly RecurringWeekRecord[]) {
  if (!records.length) return undefined
  const header = records.find((record) => 'itemCount' in record)
  if (!header || !('itemCount' in header)) throw new Error('Missing recurring week header')
  const entries = records.filter((record) => 'position' in record).filter((record) => record.position < header.itemCount).sort((a, b) => a.position - b.position)
  if (entries.length !== header.itemCount || entries.some((entry, index) => entry.position !== index || entry.createdAt !== header.createdAt || entry.updatedAt !== header.updatedAt)) throw new Error('Incomplete recurring week')
  return parseRecurringWeekDocument({ schemaVersion: 1, id: 'default', items: entries.map((entry) => entry.activity), createdAt: header.createdAt, updatedAt: header.updatedAt,
    ...(header.revision === undefined ? {} : { revision: header.revision }) })
}

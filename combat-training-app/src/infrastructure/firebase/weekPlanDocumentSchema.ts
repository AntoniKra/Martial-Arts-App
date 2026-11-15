import * as z from 'zod/mini'
import { instantSchema } from './workoutDocumentSchemas'
import { isMonday } from '@/domain/week-plan/weekCalendar'
import { WEEK_PLAN_ITEM_LIMIT } from '@/domain/week-plan/weekPlan.types'
import { scheduledWeekItemSchema } from './recurringWeekDocumentSchema'
import type { WeekPlan } from '@/domain/week-plan/weekPlan.types'

const id = z.string().check(z.minLength(1), z.refine((value) => !value.includes('/')))
const item = z.discriminatedUnion('kind', [
  z.strictObject({ id, kind: z.literal('plan'), workoutPlanId: id, planNameSnapshot: z.string().check(z.minLength(1)) }),
  z.strictObject({ id, kind: z.literal('category'), category: z.enum([
    'technique', 'pads', 'bag', 'sparring', 'conditioning', 'strengthAndConditioning', 'mixed',
  ]) }),
])

const legacyWeekPlanDocumentSchema = z.strictObject({
  schemaVersion: z.literal(1), weekStart: z.iso.date().check(z.refine(isMonday)),
  items: z.array(item).check(z.maxLength(WEEK_PLAN_ITEM_LIMIT)),
  createdAt: instantSchema, updatedAt: instantSchema, editedAfterWeekEnd: z.boolean(),
}).check(z.refine((plan) => new Set(plan.items.map((entry) => entry.id)).size === plan.items.length))

const scheduledWeekPlanDocumentSchema = z.strictObject({
  schemaVersion: z.literal(2), weekStart: z.iso.date().check(z.refine(isMonday)),
  items: z.array(item).check(z.maxLength(0)),
  schedule: z.array(scheduledWeekItemSchema).check(z.maxLength(WEEK_PLAN_ITEM_LIMIT), z.refine((items) => new Set(items.map((entry) => entry.id)).size === items.length)),
  targetCount: z.number().check(z.int(), z.minimum(0), z.maximum(14)),
  createdAt: instantSchema, updatedAt: instantSchema, editedAfterWeekEnd: z.boolean(),
})

export const scheduledWeekHeaderSchema = z.strictObject({
  schemaVersion: z.literal(2), weekStart: z.iso.date().check(z.refine(isMonday)),
  items: z.array(item).check(z.maxLength(0)), scheduleSize: z.number().check(z.int(), z.minimum(0), z.maximum(14)),
  targetCount: z.number().check(z.int(), z.minimum(0), z.maximum(14)), createdAt: instantSchema, updatedAt: instantSchema, editedAfterWeekEnd: z.boolean(),
})
export const scheduledWeekEntrySchema = z.strictObject({ schemaVersion: z.literal(2), weekStart: z.iso.date().check(z.refine(isMonday)),
  position: z.number().check(z.int(), z.minimum(0), z.maximum(13)), activity: scheduledWeekItemSchema, createdAt: instantSchema, updatedAt: instantSchema })

export function storedWeekPlanDocuments(plan: WeekPlan) {
  if (plan.schedule === undefined) return [{ id: plan.weekStart, data: weekPlanDocumentSchema.parse({ ...plan, schemaVersion: 1 }) }]
  const { schedule, ...fields } = plan
  const header = scheduledWeekHeaderSchema.parse({ ...fields, schemaVersion: 2, scheduleSize: schedule.length })
  return [{ id: plan.weekStart, data: header }, ...schedule.map((activity, position) => ({ id: `${plan.weekStart}~${position}`,
    data: scheduledWeekEntrySchema.parse({ schemaVersion: 2, weekStart: plan.weekStart, position, activity, createdAt: plan.createdAt, updatedAt: plan.updatedAt }) }))]
}

export function combineWeekPlanDocuments(documents: readonly { id: string; data: unknown }[]): WeekPlan {
  const rawHeader = documents.find((document) => !document.id.includes('~'))
  if (!rawHeader) throw new Error('Missing week header')
  const raw = rawHeader.data
  if (typeof raw !== 'object' || raw === null || !('scheduleSize' in raw)) {
    if (documents.length !== 1) throw new Error('Unexpected entries for a legacy week')
    return parseWeekPlanDocument(raw)
  }
  const header = scheduledWeekHeaderSchema.parse(raw)
  const entries = documents.filter((document) => document.id !== rawHeader.id)
    .map((document) => ({ ...document, entry: scheduledWeekEntrySchema.parse(document.data) }))
    .filter(({ entry }) => entry.position < header.scheduleSize).map(({ id, entry }) => {
    if (id !== `${header.weekStart}~${entry.position}` || entry.weekStart !== header.weekStart || entry.createdAt !== header.createdAt || entry.updatedAt !== header.updatedAt) throw new Error('Week entry identity mismatch')
    return entry
  }).sort((a, b) => a.position - b.position)
  if (entries.length !== header.scheduleSize || entries.some((entry, index) => entry.position !== index)) throw new Error('Incomplete scheduled week')
  const { schemaVersion: _version, scheduleSize: _size, ...plan } = header
  return parseWeekPlanDocument({ ...plan, schemaVersion: 2, schedule: entries.map((entry) => entry.activity) })
}

export const weekPlanDocumentSchema = z.discriminatedUnion('schemaVersion', [legacyWeekPlanDocumentSchema, scheduledWeekPlanDocumentSchema])

export function parseWeekPlanDocument(value: unknown): WeekPlan {
  const { schemaVersion: _version, ...plan } = weekPlanDocumentSchema.parse(value)
  return plan
}

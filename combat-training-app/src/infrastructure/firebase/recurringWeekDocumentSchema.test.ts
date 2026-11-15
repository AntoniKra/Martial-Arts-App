import { describe, expect, it } from 'vitest'
import { recurringWeekDocumentSchema, scheduledWeekItemSchema, recurringWeekRecords, combineRecurringWeekRecords, recurringWeekRecordSchema } from './recurringWeekDocumentSchema'
import { weekPlanDocumentSchema, parseWeekPlanDocument, storedWeekPlanDocuments, combineWeekPlanDocuments } from './weekPlanDocumentSchema'
import type { RecurringWeek } from '@/domain/week-plan/weekPlan.types'

const club = { id: 'club', kind: 'club', day: 1, disciplineKey: 'muay_thai', startTime: '19:00', endTime: '20:30', parts: ['technique'], clubName: null }
const document = { id: 'default', schemaVersion: 1, items: [club], createdAt: '2026-11-10T10:00:00.000Z', updatedAt: '2026-11-10T10:00:00.000Z' }
describe('recurring and scheduled document validation', () => {
  it.each([0, 1])('ignores stale surplus slots beyond header count %i but still requires every lower position', (count) => {
    const recurring: RecurringWeek = { id: 'default', items: Array.from({ length: 3 }, (_, index) => ({ id: String(index), kind: 'rest', day: 0 })), createdAt: document.createdAt, updatedAt: document.updatedAt }
    const shortened = { ...recurring, items: recurring.items.slice(0, count), updatedAt: '2026-11-11T10:00:00.000Z' }
    const surplus = recurringWeekRecords(recurring).slice(count + 1)
    const records = [...recurringWeekRecords(shortened), ...surplus]
    expect(combineRecurringWeekRecords(records)).toEqual(shortened)
    if (count) expect(() => combineRecurringWeekRecords(records.filter((record) => record.id !== 'item-0'))).toThrow('Incomplete')

    const plan = { weekStart: '2026-11-09', items: [], schedule: recurring.items.map((item) => ({ ...item, omitted: false })), targetCount: 3, createdAt: document.createdAt, updatedAt: document.updatedAt, editedAfterWeekEnd: false }
    const shortenedPlan = { ...plan, schedule: plan.schedule.slice(0, count), updatedAt: shortened.updatedAt }
    const documents = [...storedWeekPlanDocuments(shortenedPlan), ...storedWeekPlanDocuments(plan).slice(count + 1)]
    expect(combineWeekPlanDocuments(documents)).toEqual(shortenedPlan)
    if (count) expect(() => combineWeekPlanDocuments(documents.filter((entry) => entry.id !== `${plan.weekStart}~0`))).toThrow('Incomplete')
  })
  it('round-trips bounded physical records and rejects missing, duplicate and mismatched entries', () => {
    const recurring: RecurringWeek = { id: 'default', items: [{ ...club, kind: 'club', day: 1, disciplineKey: 'muay_thai', parts: ['technique'] }], createdAt: document.createdAt, updatedAt: document.updatedAt }
    const records = recurringWeekRecords(recurring)
    expect(records.map((record) => recurringWeekRecordSchema.parse(record))).toEqual(records)
    expect(combineRecurringWeekRecords([...records].reverse())).toEqual(recurring)
    expect(() => combineRecurringWeekRecords(records.slice(0, 1))).toThrow('Incomplete')
    expect(() => combineRecurringWeekRecords(records.slice(1))).toThrow('Missing')
    expect(() => combineRecurringWeekRecords(records.map((record) => 'position' in record ? { ...record, updatedAt: '2026-11-11T10:00:00.000Z' } : record))).toThrow('Incomplete')
    const plan = { weekStart: '2026-11-09', items: [], schedule: recurring.items.map((item) => ({ ...item, omitted: false })), targetCount: 1, createdAt: document.createdAt, updatedAt: document.updatedAt, editedAfterWeekEnd: false }
    const documents = storedWeekPlanDocuments(plan)
    expect(combineWeekPlanDocuments([...documents].reverse())).toEqual(plan)
    expect(() => combineWeekPlanDocuments(documents.slice(0, 1))).toThrow('Incomplete')
    expect(() => combineWeekPlanDocuments([documents[0], { ...documents[1], id: '2026-11-09~1' }])).toThrow('identity')
    expect(() => combineWeekPlanDocuments([documents[0], documents[1], documents[1]])).toThrow('Incomplete')
  })
  it('accepts all activity variants and scheduled v2; reading legacy does not add fields', () => {
    const own = { id: 'own', kind: 'own', day: null, category: 'bag', workoutPlanId: null, planNameSnapshot: null }
    expect(recurringWeekDocumentSchema.safeParse({ ...document, items: [club, own, { id: 'rest', kind: 'rest', day: 2 }] }).success).toBe(true)
    const legacy = { schemaVersion: 1, weekStart: '2026-11-09', items: [], createdAt: document.createdAt, updatedAt: document.updatedAt, editedAfterWeekEnd: false }
    expect(parseWeekPlanDocument(legacy)).not.toHaveProperty('schedule')
    expect(weekPlanDocumentSchema.safeParse({ ...legacy, schemaVersion: 2, schedule: [{ ...club, omitted: false }], targetCount: 3 }).success).toBe(true)
    expect(weekPlanDocumentSchema.safeParse({ ...legacy, schemaVersion: 2, schedule: [], targetCount: 15 }).success).toBe(false)
  })
  it.each([{ day: null }, { day: 7 }, { day: 1.5 }, { startTime: '25:00' }, { endTime: '18:00' }, { parts: ['bag', 'bag'] },
    { parts: ['mixed'] }, { clubName: 'x'.repeat(101) }, { disciplineKey: 'wrestling' }, { unknown: true }])('rejects malformed activities %j', (fields) => {
    expect(recurringWeekDocumentSchema.safeParse({ ...document, items: [{ ...club, ...fields }] }).success).toBe(false)
    expect(scheduledWeekItemSchema.safeParse({ ...club, omitted: false, ...fields }).success).toBe(false)
  })
  it('rejects duplicate ids, excess activities, wrong singleton id and omitted rest', () => {
    expect(recurringWeekDocumentSchema.safeParse({ ...document, items: [club, club] }).success).toBe(false)
    expect(recurringWeekDocumentSchema.safeParse({ ...document, items: Array.from({ length: 15 }, (_, index) => ({ ...club, id: String(index) })) }).success).toBe(false)
    expect(recurringWeekDocumentSchema.safeParse({ ...document, id: 'another' }).success).toBe(false)
    expect(scheduledWeekItemSchema.safeParse({ id: 'rest', kind: 'rest', day: 0, omitted: true }).success).toBe(false)
  })
})

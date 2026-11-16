import { describe, expect, it } from 'vitest'
import { generateScheduledWeek } from './scheduledWeek'
import { scheduledWeekFromLegacy, updateCurrentWeekFromRecurring } from './updateRecurringWeek'
import type { RecurringWeek, WeekActivity, WeekPlan } from './weekPlan.types'

const now = new Date('2026-11-17T10:00:00Z'), weekStart = '2026-11-16'
const club: WeekActivity = { id: 'club', kind: 'club', day: 1, disciplineKey: 'boxing', startTime: '18:00', endTime: '19:30', parts: ['technique'], clubName: null }
const recurring = (items: WeekActivity[]): RecurringWeek => ({ id: 'default', items, createdAt: now.toISOString(), updatedAt: now.toISOString() })
const week = (items: WeekActivity[]) => generateScheduledWeek(weekStart, recurring(items), now)

describe('recurring changes from today in Warsaw', () => {
  it('creates a missing current snapshot from the previous template before applying a change', () => {
    const previous = recurring([club, { ...club, id: 'unchanged', day: 4 }])
    const next = recurring([{ ...club, startTime: '17:00' }, previous.items[1]])
    const result = updateCurrentWeekFromRecurring(previous, next, undefined, now)
    expect(result.schedule).toHaveLength(2)
    expect(result.schedule?.[0]).toMatchObject({ id: `${weekStart}:club`, startTime: '17:00' })
    expect(result.schedule?.[1]).toMatchObject({ id: `${weekStart}:unchanged`, day: 4 })
  })


  it('adds today and future entries, skips past days and includes any-day training', () => {
    const own: WeekActivity = { id: 'own', kind: 'own', day: null, category: 'bag', workoutPlanId: null, planNameSnapshot: null }
    const result = updateCurrentWeekFromRecurring(undefined, recurring([{ ...club, id: 'past', day: 0 }, club, { ...club, id: 'future', day: 6 }, own]), undefined, now)
    expect(result.schedule?.map((item) => item.id)).toEqual([`${weekStart}:club`, `${weekStart}:future`, `${weekStart}:own`])
    expect(result.targetCount).toBe(3)
  })
  it('edits and removes untouched occurrences without changing their identities or history', () => {
    const old = recurring([club, { ...club, id: 'deleted', day: 4 }])
    const current = generateScheduledWeek(weekStart, old, now)
    const next = recurring([{ ...club, startTime: '17:00' }])
    const changed = updateCurrentWeekFromRecurring(old, next, current, now)
    expect(changed.schedule).toEqual([{ ...next.items[0], id: `${weekStart}:club`, omitted: false }])
    expect(changed.createdAt).toBe(current.createdAt)
    expect(changed.targetCount).toBe(1)
    expect(current.schedule).toHaveLength(2)
  })
  it('preserves past days even when their recurring entries are changed or removed', () => {
    const old = recurring([{ ...club, day: 0 }]), current = week(old.items)
    expect(updateCurrentWeekFromRecurring(old, recurring([]), current, now).schedule).toEqual(current.schedule)
    expect(updateCurrentWeekFromRecurring(old, recurring([{ ...club, day: 4 }]), current, now).schedule).toEqual(current.schedule)
  })
  it('never moves an untouched future occurrence into the past', () => {
    const current = week([club])
    expect(updateCurrentWeekFromRecurring(recurring([club]), recurring([{ ...club, day: 0 }]), current, now).schedule).toEqual(current.schedule)
  })
  it.each(['move', 'omit', 'edit', 'detached', 'removed'] as const)('preserves a manually %s occurrence', (action) => {
    const current = week([club])
    const item = current.schedule![0]
    if (action === 'move') item.day = 4
    if (action === 'omit') item.omitted = true
    if (action === 'edit') { if (item.kind === 'club') item.clubName = 'Manual' }
    if (action === 'detached') item.id = 'manual-override'
    if (action === 'removed') current.schedule = []
    for (const next of [recurring([]), recurring([{ ...club, startTime: '17:00' }])]) {
      expect(updateCurrentWeekFromRecurring(recurring([club]), next, current, now).schedule).toEqual(current.schedule)
    }
  })
  it('leaves week-only additions intact and adjusts an independent target by the occurrence delta', () => {
    const current = week([]); current.schedule!.push({ ...club, id: 'week-only', omitted: false }); current.targetCount = 5
    const next = updateCurrentWeekFromRecurring(undefined, recurring([club]), current, now)
    expect(next.schedule).toHaveLength(2); expect(next.targetCount).toBe(6)
  })
  it('updates Sunday immediately using Warsaw rather than the device or UTC date', () => {
    const sunday = new Date('2026-11-21T23:30:00Z')
    const result = updateCurrentWeekFromRecurring(undefined, recurring([{ ...club, day: 6 }, { ...club, id: 'saturday', day: 5 }]), undefined, sunday)
    expect(result.weekStart).toBe(weekStart)
    expect(result.schedule?.map((item) => item.day)).toEqual([6])
    const monday = updateCurrentWeekFromRecurring(undefined, recurring([club]), undefined, new Date('2026-11-22T23:30:00Z'))
    expect(monday.weekStart).toBe('2026-11-23')
  })
  it('recognizes old indexed occurrences and stabilizes their IDs before a reorder', () => {
    const previous = recurring([club, { ...club, id: 'second', day: 4 }]), current = week(previous.items)
    current.schedule!.forEach((item, index) => { item.id = `${weekStart}:${index}` })
    const next = recurring([...previous.items].reverse())
    const result = updateCurrentWeekFromRecurring(previous, next, current, now)
    expect(result.schedule?.map((item) => item.id)).toEqual([`${weekStart}:club`, `${weekStart}:second`])
    expect(updateCurrentWeekFromRecurring(next, recurring([club]), result, now).schedule).toHaveLength(1)
  })
  it('rejects overflow rather than dropping a manual or recurring item', () => {
    const current = week([]); current.schedule = Array.from({ length: 14 }, (_, i) => ({ ...club, id: `manual-${i}`, omitted: false }))
    expect(() => updateCurrentWeekFromRecurring(undefined, recurring([club]), current, now)).toThrow('limit')
    expect(current.schedule).toHaveLength(14)
  })
})

describe('legacy week presentation and migration', () => {
  it('preserves every ID, saved plan name, category and history field without rewriting on read', () => {
    const legacy: WeekPlan = { weekStart, items: [{ id: 'plan', kind: 'plan', workoutPlanId: 'bag-plan', planNameSnapshot: 'Saved name' }, { id: 'category', kind: 'category', category: 'pads' }], createdAt: '2026-11-01T10:00:00Z', updatedAt: now.toISOString(), editedAfterWeekEnd: true }
    const migrated = scheduledWeekFromLegacy(legacy)
    expect(migrated).toMatchObject({ ...legacy, items: [], targetCount: 2 })
    expect(migrated.schedule).toEqual([
      { id: 'plan', kind: 'own', day: null, category: 'mixed', workoutPlanId: 'bag-plan', planNameSnapshot: 'Saved name', omitted: false, legacyGoal: legacy.items[0] },
      { id: 'category', kind: 'own', day: null, category: 'pads', workoutPlanId: null, planNameSnapshot: null, omitted: false, legacyGoal: legacy.items[1] },
    ])
    expect(legacy.items).toHaveLength(2)
    expect(scheduledWeekFromLegacy(migrated)).toBe(migrated)
  })
})

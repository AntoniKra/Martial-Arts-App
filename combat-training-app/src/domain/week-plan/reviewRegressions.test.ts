import { describe, expect, it } from 'vitest'
import { calculateWeekPlanProgress } from './weekPlanProgress'
import { calculateScheduledWeek, generateScheduledWeek } from './scheduledWeek'
import { scheduledWeekFromLegacy, updateCurrentWeekFromRecurring } from './updateRecurringWeek'
import { manualWorkoutSession } from '@/test/manualWorkoutBuilder'
import { workoutSession } from '@/test/workoutSessionBuilders'
import type { RecurringWeek, WeekPlan } from './weekPlan.types'

const now = new Date('2026-11-17T10:00:00Z'), instant = now.toISOString(), start = '2026-11-16'
const legacy: WeekPlan = { weekStart: start, items: [{ id: 'exact', kind: 'plan', workoutPlanId: 'deleted-plan', planNameSnapshot: 'Saved plan' }], createdAt: instant, updatedAt: instant, editedAfterWeekEnd: false }
describe('PR 177 review regressions', () => {
  it('does not report an unknown legacy plan type as a planned mixed workout', () => {
    const migrated = scheduledWeekFromLegacy(legacy)
    migrated.schedule!.push({ id: 'mixed', kind: 'own', day: null, category: 'mixed', workoutPlanId: null, planNameSnapshot: null, omitted: false })
    expect(calculateScheduledWeek(migrated, [], '2026-11-17').types).toEqual([{ category: 'mixed', planned: 1, completed: 0 }])
  })
  it('never credits a manual session to an exact legacy plan, before or after migration', () => {
    const journal = [manualWorkoutSession({ workoutDate: '2026-11-17', category: 'bag', parts: ['bag'] })]
    for (const plan of [legacy, scheduledWeekFromLegacy(legacy)]) {
      const progress = calculateWeekPlanProgress(start, plan, journal, '2026-11-17')
      expect(progress).toMatchObject({ completed: 0, partial: 0, total: 1, percentage: 0 })
      expect(progress.scheduleProgress?.matches[0]).toMatchObject({ session: null, status: 'planned' })
      expect(progress.extra).toEqual(journal)
    }
  })
  it.each(['completed', 'partial'] as const)('preserves %s for a deleted exact plan without any library lookup', (status) => {
    const journal = [workoutSession({ workoutPlanId: 'deleted-plan', workoutDate: '2026-11-17', category: 'bag', status })]
    const migrated = scheduledWeekFromLegacy(legacy)
    const original = calculateWeekPlanProgress(start, legacy, journal)
    const after = calculateWeekPlanProgress(start, migrated, journal)
    expect(after).toMatchObject({ completed: original.completed, partial: original.partial, percentage: original.percentage })
    expect(after.matches[0].session).toEqual(journal[0])
    expect(calculateScheduledWeek(migrated, journal, '2026-11-17').matches[0].status).toBe(status === 'completed' ? 'done' : 'partial')
  })
  it('reconciles a newer template idempotently, preserving detached, deleted and week-only entries', () => {
    const previous: RecurringWeek = { id: 'default', revision: 1, createdAt: instant, updatedAt: instant, items: [
      { id: 'club', kind: 'club', day: 4, disciplineKey: 'boxing', startTime: '18:00', endTime: '19:30', parts: [], clubName: null },
      { id: 'removed', kind: 'own', day: null, category: 'bag', workoutPlanId: null, planNameSnapshot: null },
    ] }
    const current = generateScheduledWeek(start, previous, now)
    current.schedule = [{ ...current.schedule![0], id: 'manual-omitted', omitted: true },
      { id: 'week-only', kind: 'own', day: null, category: 'pads', workoutPlanId: null, planNameSnapshot: null, omitted: false }]
    const next = { ...previous, revision: 2, items: previous.items.map((item) => item.kind === 'club' ? { ...item, startTime: '17:00' } : item) }
    const first = updateCurrentWeekFromRecurring(undefined, next, current, now)
    const second = updateCurrentWeekFromRecurring(undefined, next, first, now)
    expect(first.schedule).toEqual(current.schedule)
    expect(second).toEqual(first)
    expect(first.appliedRecurringRevision).toBe(2)
  })
})

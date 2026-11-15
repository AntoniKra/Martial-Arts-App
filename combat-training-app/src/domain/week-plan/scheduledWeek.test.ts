import { describe, expect, it } from 'vitest'
import { manualWorkoutSession } from '@/test/manualWorkoutBuilder'
import { workoutSession } from '@/test/workoutSessionBuilders'
import { calculateScheduledWeek, changeScheduledWeek, generateScheduledWeek } from './scheduledWeek'
import type { RecurringWeek, WeekActivity } from './weekPlan.types'

const now = new Date('2026-11-10T10:00:00.000Z')
const own = (id: string, day: 0 | 1 | null = null, category: 'bag' | 'technique' | 'pads' = 'bag'): WeekActivity =>
  ({ id, kind: 'own', day, category, workoutPlanId: null, planNameSnapshot: null })
const club: WeekActivity = { id: 'club', kind: 'club', day: 1, disciplineKey: 'boxing', startTime: '19:00', endTime: '20:30', parts: ['technique'], clubName: null }
const template = (items: WeekActivity[]): RecurringWeek => ({ id: 'default', items, createdAt: now.toISOString(), updatedAt: now.toISOString() })
const week = (items: WeekActivity[]) => generateScheduledWeek('2026-11-09', template(items), now)
const manual = (id: string, date = '2026-11-10') => manualWorkoutSession({ id, workoutDate: date, category: 'technique', parts: ['technique'] })

describe('scheduled week', () => {
  it('generates independent weeks, stable occurrence IDs and a goal excluding rest', () => {
    const source = template([club, own('any'), { id: 'rest', kind: 'rest', day: 2 }])
    const first = generateScheduledWeek('2026-11-09', source, now)
    const next = generateScheduledWeek('2026-11-16', source, now)
    expect(first.targetCount).toBe(2)
    expect(first.schedule?.map((item) => item.id)).not.toEqual(next.schedule?.map((item) => item.id))
    const changed = changeScheduledWeek(first, first.schedule!.map((item) => ({ ...item, day: 4 })), 5, now)
    expect(source.items[0].day).toBe(1)
    expect(next.schedule?.[0].day).toBe(1)
    expect(first.schedule?.[0].day).toBe(1)
    expect(changed.schedule?.[0].day).toBe(4)
    expect(changed.targetCount).toBe(5)
  })
  it('requires the day, discipline and a matching club part; empty optional parts accept that discipline', () => {
    const plan = week([club])
    for (const session of [manual('wrong-day', '2026-11-11'), { ...manual('wrong-discipline'), disciplineKey: 'muay_thai' as const },
      { ...manual('wrong-part'), category: 'bag' as const, parts: ['bag' as const] }]) {
      expect(calculateScheduledWeek(plan, [session], '2026-11-10').extra).toHaveLength(1)
    }
    expect(calculateScheduledWeek(plan, [manual('correct')], '2026-11-10').matches[0].status).toBe('done')
    expect(calculateScheduledWeek(week([{ ...club, parts: [] }]), [{ ...manual('any-part'), parts: ['bag'] }], '2026-11-10').matches[0].status).toBe('done')
  })
  it.each([false, true])('maximizes matching across flexible and dated entries, reversed=%s', (reverse) => {
    const items: WeekActivity[] = [own('flexible', null, 'technique'), { ...club, parts: ['technique', 'pads'] }]
    const plan = week(reverse ? items.reverse() : items)
    const sessions = [manual('tuesday'), manual('wednesday', '2026-11-11')]
    const result = calculateScheduledWeek(plan, sessions, '2026-11-11')
    expect(result.matches.filter((match) => match.status === 'done')).toHaveLength(2)
    expect(result.extra).toEqual([])
    expect(new Set(result.matches.map((match) => match.session?.id)).size).toBe(2)
    expect(calculateScheduledWeek(plan, sessions.slice(0, 1), '2026-11-11').matches.filter((match) => match.status === 'done')).toHaveLength(1)
  })
  it('maximizes matching between parts and counts unmatched sessions toward the goal without exceeding 100%', () => {
    const plan = week([own('technique', null, 'technique'), own('pads', null, 'pads')])
    const result = calculateScheduledWeek(plan, [manualWorkoutSession({ id: 'multi', workoutDate: '2026-11-09', parts: ['technique', 'pads'], category: 'mixed' }),
      manual('single'), manual('extra')], '2026-11-11')
    expect(result.matches.every((match) => match.status === 'done')).toBe(true)
    expect(result.extra).toHaveLength(1)
    expect(result.workoutCount).toBe(3)
    expect(result.percentage).toBe(100)
  })
  it('matches saved plan and timer sessions by type and stored date, including partial sessions', () => {
    for (const source of ['plan', 'quickTimer'] as const) {
      const session = workoutSession({ id: source, category: 'bag', workoutDate: '2026-11-10', status: 'partial' })
      const value = source === 'plan' ? session : { ...session, source, completion: { ...session.completion, unit: 'round' as const } }
      expect(calculateScheduledWeek(week([own('bag', 1)]), [value], '2026-11-10').matches[0].status).toBe('done')
    }
  })
  it('derives missed, planned, consciously omitted and rest statuses without writing them', () => {
    const plan = week([own('yesterday', 0), own('today', 1), own('flexible'), { id: 'rest', kind: 'rest', day: 0 }])
    plan.schedule![1].omitted = true
    const result = calculateScheduledWeek(plan, [], '2026-11-10')
    expect(result.matches.map((match) => match.status)).toEqual(['missed', 'omitted', 'planned', 'rest'])
    expect(calculateScheduledWeek(plan, [], '2026-11-16').matches[2].status).toBe('missed')
    expect(calculateScheduledWeek(plan, [{ ...manual('omitted'), category: 'bag', parts: ['bag'] }], '2026-11-10').matches[1].session).toBeNull()
  })
})

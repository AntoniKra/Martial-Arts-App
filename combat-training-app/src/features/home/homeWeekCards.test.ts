import { describe, expect, it } from 'vitest'
import { selectHomeSchedule } from '@/domain/week-plan/homeSchedule'
import { generateScheduledWeek } from '@/domain/week-plan/scheduledWeek'
import type { ScheduledWeekItem } from '@/domain/week-plan/weekPlan.types'
import { workoutSession } from '@/test/workoutSessionBuilders'
import { selectHomeWeekCards } from './homeWeekCards'

const now = new Date('2026-11-17T10:00:00Z'), start = '2026-11-16', today = '2026-11-17'
const club: ScheduledWeekItem = { id: 'club', kind: 'club', day: 3, disciplineKey: 'boxing', startTime: '18:00', endTime: '19:30', parts: ['technique'], clubName: null, omitted: false }
const own: ScheduledWeekItem = { id: 'own', kind: 'own', day: null, category: 'bag', workoutPlanId: 'bag', planNameSnapshot: 'Worek', omitted: false }
function week(items: ScheduledWeekItem[], weekStart = start) {
  return { ...generateScheduledWeek(weekStart, undefined, now), schedule: items }
}

describe('home week cards', () => {
  it('selects the earliest next workout in this week and every outstanding flexible item', () => {
    const current = week([{ ...club, id: 'later', day: 5 }, club, own, { ...own, id: 'other', workoutPlanId: 'other' }])
    const cards = selectHomeWeekCards(selectHomeSchedule(current, [current], [], today), start)
    expect(cards.next).toMatchObject({ date: '2026-11-19', item: club })
    expect(cards.flexible.map(({ item }) => item.id)).toEqual(['own', 'other'])
  })
  it('keeps the rest-day next-week hint but omits that card from this week', () => {
    const current = week([]), future = week([club], '2026-11-23')
    const schedule = selectHomeSchedule(current, [current, future], [], today)
    expect(schedule.next?.date).toBe('2026-11-26')
    expect(selectHomeWeekCards(schedule, start)).toEqual({ next: null, flexible: [] })
  })
  it('omits completed, omitted and past activities without changing matching rules', () => {
    const current = week([{ ...club, omitted: true }, { ...club, id: 'past', day: 0 }, own,
      { ...own, id: 'omitted-own', omitted: true }])
    const sessions = [workoutSession({ workoutPlanId: 'bag', workoutDate: today, category: 'bag' })]
    expect(selectHomeWeekCards(selectHomeSchedule(current, [current], sessions, today), start)).toEqual({ next: null, flexible: [] })
  })
})

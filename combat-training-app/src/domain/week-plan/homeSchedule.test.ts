import { describe, expect, it } from 'vitest'
import { manualWorkoutSession } from '@/test/manualWorkoutBuilder'
import { selectHomeSchedule } from './homeSchedule'
import { generateScheduledWeek } from './scheduledWeek'
import { clubWorkoutPrefill } from './clubWorkoutPrefill'
import { createManualWorkoutDraft, changeManualParts } from '@/domain/workout-session/manualWorkoutEntry'
import type { ScheduledWeekItem, WeekActivity } from './weekPlan.types'

const now = new Date('2026-11-17T10:00:00Z'), today = '2026-11-17'
const club: ScheduledWeekItem = { id: 'club', kind: 'club', day: 1, disciplineKey: 'muay_thai', startTime: '19:00', endTime: '20:30',
  parts: ['technique', 'pads', 'sparring'], clubName: null, omitted: false }
const own: ScheduledWeekItem = { id: 'own', kind: 'own', day: null, category: 'bag', workoutPlanId: 'bag', planNameSnapshot: 'Bag', omitted: false }
function week(items: (WeekActivity | ScheduledWeekItem)[], start = '2026-11-16') {
  const plan = generateScheduledWeek(start, { id: 'default', items, createdAt: now.toISOString(), updatedAt: now.toISOString() }, now)
  return { ...plan, schedule: items.map((item) => ({ ...item, omitted: 'omitted' in item ? Boolean(item.omitted) : false })) }
}

describe('home schedule', () => {
  it('selects club today, rest with a next session, and no plan without fabricating activities', () => {
    const plan = week([club, own])
    expect(selectHomeSchedule(plan, [plan], [], today)).toMatchObject({ kind: 'club', todayClubs: [{ item: club }], flexible: [{ item: own }] })
    const rest = selectHomeSchedule(plan, [plan], [], '2026-11-16')
    expect(rest.kind).toBe('rest')
    expect(rest.next).toMatchObject({ date: today, item: club })
    const empty = week([])
    expect(selectHomeSchedule(empty, [empty], [], today)).toMatchObject({ kind: 'noPlan', next: null, todayClubs: [], overdue: [] })
  })
  it('keeps multiple club entries today and excludes a consciously omitted entry', () => {
    const plan = week([club, { ...club, id: 'evening', startTime: '21:00' }, { ...club, id: 'omitted', omitted: true }])
    expect(selectHomeSchedule(plan, [plan], [], today).todayClubs.map(({ item }) => item.id)).toEqual(['club', 'evening'])
  })
  it('uses the moved dated snapshot and finds the first next class across a week boundary', () => {
    const current = week([{ ...club, day: 0 }])
    const future = week([{ ...club, day: 3 }, { ...club, id: 'earlier', day: 0 }], '2026-11-23')
    expect(selectHomeSchedule(current, [current, future], [], today).next).toMatchObject({ date: '2026-11-23', item: { id: 'earlier' } })
  })
  it('orders two next classes on the same day by their start time', () => {
    const plan = week([{ ...club, day: 3, startTime: '21:00' }, { ...club, id: 'early', day: 3, startTime: '10:00' }])
    expect(selectHomeSchedule(plan, [plan], [], today).next?.item.id).toBe('early')
  })
  it('lists only unmatched club entries from the last seven days including the previous week', () => {
    const plan = week([club, { ...club, id: 'yesterday', day: 0 }, own])
    const previous = week([{ ...club, id: 'seven', day: 1 }, { ...club, id: 'eight', day: 0 },
      { ...club, id: 'omitted', day: 2, omitted: true }, { ...club, id: 'done', day: 3 }], '2026-11-09')
    const sessions = [manualWorkoutSession({ workoutDate: '2026-11-12', disciplineKey: 'muay_thai', parts: ['technique'] })]
    expect(selectHomeSchedule(plan, [previous, plan], sessions, today).overdue.map(({ item }) => item.id)).toEqual(['yesterday', 'seven'])
  })
  it('removes the reminder after a matching entry without reusing one session for two classes', () => {
    const plan = week([{ ...club, id: 'one', day: 0 }, { ...club, id: 'two', day: 0 }])
    const session = manualWorkoutSession({ workoutDate: '2026-11-16', disciplineKey: 'muay_thai', parts: ['pads'] })
    const result = selectHomeSchedule(plan, [plan], [session], today)
    expect(result.overdue).toHaveLength(1)
    expect(result.days[0]).toMatchObject({ done: true, planned: true, symbol: '✓○' })
  })
  it('shows completion, plans, rest, omitted and free days with symbols and marks today', () => {
    const plan = week([club, { id: 'rest', kind: 'rest', day: 2 }, { ...club, id: 'skip', day: 3, omitted: true }])
    const result = selectHomeSchedule(plan, [plan], [manualWorkoutSession({ workoutDate: '2026-11-16' })], today)
    expect(result.days.map(({ symbol }) => symbol)).toEqual(['✓', '○', '–', '–', '·', '·', '·'])
    expect(result.days[1].today).toBe(true)
  })
  it('uses the shared club prefill and leaves every subjective answer blank', () => {
    const prefill = clubWorkoutPrefill('2026-11-16', club, today)!
    const draft = changeManualParts({ ...createManualWorkoutDraft(today), workoutDate: prefill.workoutDate,
      disciplineKey: prefill.disciplineKey, durationMinutes: prefill.durationMinutes }, prefill.parts)
    expect(draft).toMatchObject({ workoutDate: today, disciplineKey: 'muay_thai', durationMinutes: '90',
      parts: ['technique', 'pads', 'sparring'], rpe: null, intensity: '', rounds: '', note: '' })
    expect(prefill).not.toHaveProperty('rpe')
    expect(prefill).not.toHaveProperty('sparring')
  })
})

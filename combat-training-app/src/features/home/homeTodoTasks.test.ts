import { describe, expect, it } from 'vitest'
import { selectHomeSchedule } from '@/domain/week-plan/homeSchedule'
import { generateScheduledWeek } from '@/domain/week-plan/scheduledWeek'
import type { WeekActivity } from '@/domain/week-plan/weekPlan.types'
import { workoutSession } from '@/test/workoutSessionBuilders'
import { homeLabels } from './homeLabels'
import { homeTodoExpanderLabel, selectHomeTodoTasks } from './homeTodoTasks'

const today = '2026-11-17'
const monday = '2026-11-16'
const createdAt = '2026-11-17T10:00:00Z'
const club = { kind: 'club', disciplineKey: 'boxing', endTime: '20:30', clubName: null } as const
const week = (weekStart: string, items: WeekActivity[]) =>
  generateScheduledWeek(weekStart, { id: 'default', items, createdAt, updatedAt: createdAt }, new Date(createdAt))
const older = week('2026-11-09', [{ ...club, parts: [], id: 'older', day: 1, startTime: '19:00' }])
const current = week(monday, [
  { ...club, parts: [], id: 'late', day: 0, startTime: '19:00' },
  { ...club, parts: [], id: 'early', day: 0, startTime: '17:00' },
])
const overdue = selectHomeSchedule(current, [current, older], [], today).overdue
const reminder = workoutSession()

describe('home tasks', () => {
  it.each([
    [[], null, []],
    [overdue.slice(-1), null, ['2026-11-10:older']],
    [[], reminder, ['rpe']],
    [overdue.slice(-1), reminder, ['2026-11-10:older', 'rpe']],
    [overdue, reminder, ['2026-11-10:older', '2026-11-16:early', '2026-11-16:late', 'rpe']],
  ] as const)('counts and orders overdue dates and times before RPE', (entries, rpe, expected) => {
    const tasks = selectHomeTodoTasks(entries, rpe, today)
    expect(tasks).toHaveLength(expected.length)
    expect(tasks.map((task) => task.kind === 'rpe' ? 'rpe' : `${task.prefill.workoutDate}:${task.item.id.split(':').at(-1)}`)).toEqual(expected)
  })

  it('names a single hidden task and groups multiple hidden tasks', () => {
    const tasks = selectHomeTodoTasks(overdue, reminder, today)
    expect(homeTodoExpanderLabel(tasks.slice(-1))).toBe('Ocena RPE sesji')
    expect(homeTodoExpanderLabel(tasks.slice(1, 2))).toBe('Zaległy trening')
    expect(homeTodoExpanderLabel(tasks.slice(1))).toBe('Pozostałe zadania')
  })

  it.each([[0, '0 zadań'], [1, '1 zadanie'], [2, '2 zadania'], [5, '5 zadań'], [12, '12 zadań']])(
    'formats the task count %i in Polish', (count, expected) => {
      expect(homeLabels.taskCount(count)).toBe(expected)
    },
  )
})

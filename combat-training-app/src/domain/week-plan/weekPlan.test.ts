import { describe, expect, it } from 'vitest'
import { workoutSession } from '@/test/workoutSessionBuilders'
import type { ManualWorkoutSession, QuickTimerWorkoutSession, WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { calculateWeekPlanProgress } from './weekPlanProgress'
import { currentWeekStart, isMonday, shiftCalendarDate, weekStartForDate } from './weekCalendar'
import { copyWeekPlanItems, editWeekPlan } from './editWeekPlan'
import type { WeekPlan, WeekPlanItem } from './weekPlan.types'

const monday = '2026-11-09'
const instant = '2026-11-09T10:00:00.000Z'
const exact = (id = 'one'): WeekPlanItem => ({ id, kind: 'plan', workoutPlanId: 'bag-plan', planNameSnapshot: 'Worek' })
const category = (id = 'category', value: ManualWorkoutSession['category'] = 'bag'): WeekPlanItem => ({ id, kind: 'category', category: value })
const plan = (items: WeekPlanItem[]): WeekPlan => ({ weekStart: monday, items, createdAt: instant, updatedAt: instant, editedAfterWeekEnd: false })
const session = (id: string, changes: Partial<ReturnType<typeof workoutSession>> = {}) => workoutSession({
  id, workoutPlanId: 'bag-plan', category: 'bag', workoutDate: monday, startedAt: instant, createdAt: instant, ...changes,
})
const manual = (id: string): ManualWorkoutSession => ({ id, source: 'manual', status: 'completed', category: 'bag', disciplineKey: 'boxing',
  workoutDate: monday, timezone: 'Europe/Warsaw', durationSeconds: 60, workSeconds: null, sparringSeconds: null,
  completion: null, note: null, rpe: null, rpeRecordedAt: null, sparring: [], createdAt: instant, updatedAt: instant })

describe('week plan matching', () => {
  it('counts only completed positions in the bar and reports partial and extra separately', () => {
    const result = calculateWeekPlanProgress(monday, plan([exact('one'), exact('two'), category('sparring', 'sparring')]), [
      session('first'), session('second'), session('partial', { status: 'partial', category: 'sparring' }), session('extra', { workoutDate: '2026-11-15' }),
    ])
    expect(result).toMatchObject({ completed: 2, partial: 1, unfulfilled: 0, total: 3, workoutCount: 4 })
    expect(result.percentage).toBeCloseTo(200 / 3)
    expect(result.extra.map((item) => item.id)).toEqual(['extra'])
  })
  it('gives a later completed session precedence over an earlier partial one', () => {
    const result = calculateWeekPlanProgress(monday, plan([exact()]), [
      session('tuesday', { status: 'partial', workoutDate: '2026-11-10' }), session('friday', { workoutDate: '2026-11-13' }),
    ])
    expect(result).toMatchObject({ completed: 1, partial: 0, percentage: 100 })
    expect(result.matches[0].session?.id).toBe('friday')
    expect(result.extra[0].id).toBe('tuesday')
  })
  it('reserves exact plans before category positions regardless of position order', () => {
    const result = calculateWeekPlanProgress(monday, plan([category(), exact()]), [session('exact'), session('other', { workoutPlanId: 'another' })])
    expect(result.matches.map((item) => item.session?.id)).toEqual(['other', 'exact'])
  })
  it('matches completed categories before partial exact plans', () => {
    const result = calculateWeekPlanProgress(monday, plan([exact(), category()]), [session('partial', { status: 'partial' }), session('complete')])
    expect(result.matches.map((item) => item.session?.id)).toEqual(['complete', 'partial'])
  })
  it('does not assign one session twice or exceed 100 percent', () => {
    const one = calculateWeekPlanProgress(monday, plan([exact('a'), exact('b')]), [session('single')])
    expect(one).toMatchObject({ completed: 1, unfulfilled: 1, percentage: 50 })
    const excess = calculateWeekPlanProgress(monday, plan([exact()]), [session('a'), session('b'), session('c')])
    expect(excess).toMatchObject({ completed: 1, percentage: 100 })
    expect(excess.extra).toHaveLength(2)
  })
  it('uses the stored workoutDate, including Sunday and Monday across a year boundary', () => {
    const entries = [session('sunday', { workoutDate: '2027-01-03', startedAt: '2027-01-04T02:00:00.000Z' }),
      session('monday', { workoutDate: '2027-01-04', startedAt: '2027-01-03T23:00:00.000Z' })]
    expect(calculateWeekPlanProgress('2026-12-28', undefined, entries).workoutCount).toBe(1)
    expect(calculateWeekPlanProgress('2027-01-04', undefined, entries).workoutCount).toBe(1)
  })
  it.each([undefined, plan([])])('has no bar or extra sessions without a goal: %j', (goal) => {
    expect(calculateWeekPlanProgress(monday, goal, [session('one')])).toMatchObject({ hasGoal: false, percentage: null, extra: [], workoutCount: 1 })
  })
  it('supports manual and quick timer category entries without matching by name or treating mixed as wildcard', () => {
    const quick: QuickTimerWorkoutSession = { ...manual('timer'), source: 'quickTimer', workSeconds: 60, sparringSeconds: 0,
      startedAt: instant, completedAt: instant, stepResults: [], completion: { completed: 1, planned: 1, unit: 'round' } }
    const result = calculateWeekPlanProgress(monday, plan([exact(), category('manual'), category('timer'), category('mixed', 'mixed')]),
      [manual('manual'), quick, session('same-name', { workoutPlanId: 'different', workoutPlanNameSnapshot: 'Worek' })])
    expect(result.matches.map((entry) => entry.session?.id ?? null)).toEqual([null, 'manual', 'same-name', null])
    expect(result.extra.map((entry) => entry.id)).toEqual(['timer'])
  })
  it('sorts by date, source timestamp, id and identical item list order deterministically', () => {
    const entries: WorkoutSession[] = [session('z'), manual('b'), session('a'), session('early', { startedAt: '2026-11-09T09:00:00.000Z' }), session('next', { workoutDate: '2026-11-10' })]
    const result = calculateWeekPlanProgress(monday, plan(Array.from({ length: 5 }, (_, index) => category(String(index)))), entries.reverse())
    expect(result.matches.map((entry) => entry.session?.id)).toEqual(['early', 'a', 'b', 'z', 'next'])
  })
  it('recalculates after goal/session removal without mutating either history', () => {
    const goal = plan([exact('a'), exact('b')]), entries = [session('a'), session('b')]
    const before = JSON.stringify({ goal, entries })
    expect(calculateWeekPlanProgress(monday, goal, entries.slice(0, 1)).completed).toBe(1)
    expect(calculateWeekPlanProgress(monday, { ...goal, items: [exact()] }, entries).extra).toHaveLength(1)
    expect(JSON.stringify({ goal, entries })).toBe(before)
    expect(calculateWeekPlanProgress(monday, goal, entries).completed).toBe(2)
  })
})

describe('calendar weeks', () => {
  it.each([
    ['2026-11-08', '2026-11-02'], ['2026-11-09', '2026-11-09'],
    ['2027-01-01', '2026-12-28'], ['2027-01-04', '2027-01-04'],
    ['2026-03-29', '2026-03-23'], ['2026-03-30', '2026-03-30'], ['2026-10-25', '2026-10-19'],
  ])('%s belongs to %s', (date, expected) => expect(weekStartForDate(date)).toBe(expected))
  it.each([
    ['2026-11-08T22:59:59.000Z', '2026-11-02'], ['2026-11-08T23:00:00.000Z', '2026-11-09'],
    ['2026-03-29T21:59:59.000Z', '2026-03-23'], ['2026-03-29T22:00:00.000Z', '2026-03-30'],
    ['2026-10-25T22:59:59.000Z', '2026-10-19'], ['2026-10-25T23:00:00.000Z', '2026-10-26'],
  ])('refreshes the local week at %s', (date, expected) => expect(currentWeekStart(new Date(date), 'Europe/Warsaw')).toBe(expected))
  it('validates a real Monday and shifts without local timezone arithmetic', () => {
    expect(isMonday('2026-11-09')).toBe(true)
    for (const date of ['2026-11-10', '2026-02-30', 'invalid', '2026-13-01']) expect(isMonday(date)).toBe(false)
    expect(shiftCalendarDate('2026-12-28', 7)).toBe('2027-01-04')
  })
})

describe('editing and copying', () => {
  it('preserves creation time and makes a historical edit flag sticky', () => {
    const source = plan([exact()])
    const changed = editWeekPlan(monday, [], source, new Date('2026-11-17T10:00:00.000Z'), '2026-11-16')
    expect(changed).toMatchObject({ createdAt: instant, updatedAt: '2026-11-17T10:00:00.000Z', editedAfterWeekEnd: true, items: [] })
    expect(editWeekPlan(monday, [], changed, new Date(instant), monday).editedAfterWeekEnd).toBe(true)
    expect(source.editedAfterWeekEnd).toBe(false)
  })
  it('creates current/future plans with a fresh flag and copies only selected items with fresh IDs', () => {
    const source = plan([exact(), category()]), before = JSON.stringify(source)
    const copied = copyWeekPlanItems([category('existing')], source.items, (() => { let id = 0; return () => `new-${++id}` })())
    expect(copied.map((item) => item.id)).toEqual(['existing', 'new-1', 'new-2'])
    expect(editWeekPlan('2026-11-16', copied, undefined, new Date(instant), monday).editedAfterWeekEnd).toBe(false)
    expect(JSON.stringify(source)).toBe(before)
  })
  it('rejects an oversized copy atomically before assigning any IDs', () => {
    const target = Array.from({ length: 14 }, (_, index) => exact(String(index)))
    expect(() => copyWeekPlanItems(target, [category()], () => { throw new Error('Should not allocate') })).toThrow('limit')
    expect(target).toHaveLength(14)
    expect(() => editWeekPlan(monday, [...target, category()], undefined, new Date(instant))).toThrow('limit')
  })
})

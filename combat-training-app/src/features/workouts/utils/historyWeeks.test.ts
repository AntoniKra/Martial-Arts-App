import { expect, it } from 'vitest'
import { groupHistoryWeeks, historyInWeek, initialHistoryMonth, normalizeHistoryWeek } from './historyWeeks'
import { filterWorkoutHistory, DEFAULT_WORKOUTS_FILTERS, hasWorkoutHistoryContentFilter } from './workoutsFilters'
import { mapWorkoutSessionToHistoryListItem } from '../mappers/workoutSessionHistoryListItemMapper'
import { workoutSession } from '@/test/workoutSessionBuilders'
import { calculateWorkoutDate } from '@/domain/workout-session/workoutSessionDefinitions'

it('collapses consecutive empty weeks and does not prepend zeros before the first entry', () => {
  const item = (workoutDate: string) => ({ workoutDate, completedAt: '2030-01-01' })
  const groups = groupHistoryWeeks([item('2026-10-20'), item('2026-11-16')], '2026-11-16')
  expect(groups.map((group) => [group.start, group.end, group.emptyWeeks, group.sessions.length])).toEqual([
    ['2026-11-16', '2026-11-22', 0, 1], ['2026-10-26', '2026-11-15', 3, 0], ['2026-10-19', '2026-10-25', 0, 1],
  ])
  expect(groupHistoryWeeks([], '2026-11-16')).toEqual([])
})

it('searches names and notes case-insensitively while preserving discipline filters and ordering', () => {
  const items = [mapWorkoutSessionToHistoryListItem(workoutSession({ id: 'note', note: '  Ręka wraca do BRODY  ', disciplineKey: 'boxing' })),
    mapWorkoutSessionToHistoryListItem(workoutSession({ id: 'name', workoutPlanNameSnapshot: 'Brody', note: null, disciplineKey: 'kickboxing' }))]
  expect(filterWorkoutHistory(items, { ...DEFAULT_WORKOUTS_FILTERS, searchQuery: '  brody ' }).map((item) => item.id).sort()).toEqual(['name', 'note'])
  expect(filterWorkoutHistory(items, { ...DEFAULT_WORKOUTS_FILTERS, searchQuery: 'brody', discipline: 'boxing' }).map((item) => item.id)).toEqual(['note'])
  expect(filterWorkoutHistory(items, { ...DEFAULT_WORKOUTS_FILTERS, searchQuery: 'unknown' })).toEqual([])
})

it('keeps weeks without matching entries separate from genuine gaps, even when no entries match', () => {
  const items = ['2026-10-26', '2026-11-02', '2026-11-16'].map((workoutDate, index) =>
    mapWorkoutSessionToHistoryListItem(workoutSession({
      id: workoutDate, workoutDate, disciplineKey: index === 1 ? 'kickboxing' : 'boxing',
    })))
  const filters = { ...DEFAULT_WORKOUTS_FILTERS, discipline: 'boxing' as const }
  const matches = filterWorkoutHistory(items, filters)
  expect(groupHistoryWeeks(items, '2026-11-16', matches).map(({ start, emptyWeeks, sessions }) => [start, emptyWeeks, sessions.length])).toEqual([
    ['2026-11-16', 0, 1], ['2026-11-09', 1, 0], ['2026-11-02', 0, 0], ['2026-10-26', 0, 1],
  ])
  const week = '2026-11-02'
  expect(groupHistoryWeeks(historyInWeek(items, week), week, historyInWeek(matches, week))).toEqual([
    { start: week, end: '2026-11-08', emptyWeeks: 0, sessions: [] },
  ])
  expect(groupHistoryWeeks(items, '2026-11-16', []).map(({ emptyWeeks }) => emptyWeeks)).toEqual([0, 1, 0, 0])
  expect(hasWorkoutHistoryContentFilter(filters)).toBe(true)
  expect(hasWorkoutHistoryContentFilter({ ...DEFAULT_WORKOUTS_FILTERS, searchQuery: ' jab ' })).toBe(true)
  expect(hasWorkoutHistoryContentFilter({ ...DEFAULT_WORKOUTS_FILTERS, searchQuery: '  ', sortOrder: 'oldest' })).toBe(false)
})

it.each([
  ['2026-11-23', '2026-11-23'], ['2026-11-24', '2026-11-23'], ['2026-11-29', '2026-11-23'],
  ['2027-01-01', '2026-12-28'], ['2026-02-30', null], ['2026-13-01', null], ['2026-1-5', null], ['', null], [null, null],
])('normalizes the History week parameter %s to %s', (requested, monday) => {
  expect(normalizeHistoryWeek(requested)).toBe(monday)
})

it('opens the local current month, or the month of the explicitly selected week', () => {
  const today = calculateWorkoutDate('2026-03-31T22:10:00.000Z', 'Europe/Warsaw')
  expect(today).toBe('2026-04-01')
  expect(initialHistoryMonth(today, null)).toBe('2026-04-01')
  expect(initialHistoryMonth(today, '2026-03-30')).toBe('2026-03-01')
})

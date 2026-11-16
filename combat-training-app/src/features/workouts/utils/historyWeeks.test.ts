import { expect, it } from 'vitest'
import { groupHistoryWeeks } from './historyWeeks'
import { filterWorkoutHistory, DEFAULT_WORKOUTS_FILTERS } from './workoutsFilters'
import { mapWorkoutSessionToHistoryListItem } from '../mappers/workoutSessionHistoryListItemMapper'
import { workoutSession } from '@/test/workoutSessionBuilders'

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

import { expect, it } from 'vitest'
import { countActiveWorkoutsFilters, DEFAULT_WORKOUTS_FILTERS } from './workoutsFilters'

it('counts discipline and sorting, independently of search', () => {
  expect(countActiveWorkoutsFilters(DEFAULT_WORKOUTS_FILTERS)).toBe(0)
  expect(countActiveWorkoutsFilters({ ...DEFAULT_WORKOUTS_FILTERS, searchQuery: 'Boks' })).toBe(0)
  expect(countActiveWorkoutsFilters({ ...DEFAULT_WORKOUTS_FILTERS, discipline: 'boxing' })).toBe(1)
  expect(countActiveWorkoutsFilters({ ...DEFAULT_WORKOUTS_FILTERS, sortOrder: 'oldest' })).toBe(1)
  expect(countActiveWorkoutsFilters({ searchQuery: 'Boks', discipline: 'boxing', sortOrder: 'oldest' })).toBe(2)
})

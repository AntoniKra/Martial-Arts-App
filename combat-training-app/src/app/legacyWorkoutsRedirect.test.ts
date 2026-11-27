import { expect, it } from 'vitest'
import { legacyWorkoutsRedirect } from './legacyWorkoutsRedirect'
import { routes } from './routes'

it('redirects history while preserving week, extra parameters and hash', () => {
  expect(legacyWorkoutsRedirect('?tab=history')).toBe('/progress?tab=history')
  expect(legacyWorkoutsRedirect('?tab=history&week=2026-11-16&perf=0', '#session'))
    .toBe('/progress?tab=history&week=2026-11-16&perf=0#session')
})

it.each(['', '?tab=plans', '?tab=unknown'])('redirects the legacy list to the plans segment: %s', (search) => {
  expect(legacyWorkoutsRedirect(search)).toBe(routes.workouts)
})

it('preserves unrelated parameters and hash from legacy list links', () => {
  expect(legacyWorkoutsRedirect('?source=auth&tab=plans&perf=0', '#plans'))
    .toBe('/progress/week?tab=plans&source=auth&perf=0#plans')
})

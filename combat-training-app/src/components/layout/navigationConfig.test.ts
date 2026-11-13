import { expect, it } from 'vitest'
import { primaryNavigationItems, isNavigationItemActive } from './navigationConfig'

const item = primaryNavigationItems.find((value) => value.id === 'newWorkout')!
it.each(['/workouts/new', '/quick-timer', '/workout-sessions/new', '/quick-timer/'])('highlights the New button at %s', (path) => {
  expect(isNavigationItemActive(path, item)).toBe(true)
})
it.each(['/', '/workouts', '/workouts/plan/edit', '/quick-timer/active', '/workout-sessions/session/feedback'])('does not highlight the New button at %s', (path) => {
  expect(isNavigationItemActive(path, item)).toBe(false)
})

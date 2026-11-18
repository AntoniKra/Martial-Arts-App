import { expect, it } from 'vitest'
import { primaryNavigationItems, getMobileNavigationItems, isNavigationItemActive } from './navigationConfig'

it('uses the same order on desktop and phone with Training in the middle', () => {
  const labels = ['Start', 'Plan', 'Trening', 'Postęp', 'Profil']
  expect(primaryNavigationItems.map((entry) => entry.label)).toEqual(labels)
  expect(getMobileNavigationItems().map((entry) => entry.label)).toEqual(labels)
  expect(getMobileNavigationItems()[2].mobileVariant).toBe('create')
})

const item = primaryNavigationItems.find((value) => value.id === 'newWorkout')!
it.each(['/workouts/new', '/quick-timer', '/workout-sessions/new', '/quick-timer/'])('highlights the Training button at %s', (path) => {
  expect(isNavigationItemActive(path, item)).toBe(true)
})
it.each(['/', '/workouts', '/workouts/plan/edit', '/quick-timer/active', '/workout-sessions/session/feedback'])('does not highlight the Training button at %s', (path) => {
  expect(isNavigationItemActive(path, item)).toBe(false)
})

const activeIds = (path: string) => primaryNavigationItems.filter((entry) => isNavigationItemActive(path, entry)).map((entry) => entry.id)
it.each([
  ['/', ['home']],
  ['/progress', ['progress']],
  ['/progress/focus-skills/guard', ['progress']],
  ['/progress/week', ['plan']],
  ['/progress/week/2026-11-16/', ['plan']],
  ['/profile/consent', ['profile']],
  ['/workouts', []],
  ['/workouts/plan', []],
  ['/workouts/plan/edit', []],
  ['/exercises', []],
  ['/my-exercises', []],
  ['/progress/weekly', ['progress']],
])('activates only the matching section at %s', (path, expected) => {
  expect(activeIds(path as string)).toEqual(expected)
})

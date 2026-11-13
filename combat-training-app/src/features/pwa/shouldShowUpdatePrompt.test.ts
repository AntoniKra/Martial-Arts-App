import { describe, expect, it } from 'vitest'

import { shouldShowUpdatePrompt } from './shouldShowUpdatePrompt'

describe('shouldShowUpdatePrompt', () => {
  it.each(['/', '/workouts', '/workouts/plan-1', '/workouts/plan-1/feedback'])(
    'shows a pending update on %s', (pathname) => {
      expect(shouldShowUpdatePrompt(true, pathname)).toBe(true)
    },
  )

  it.each(['/workouts/plan-1/active', '/workouts/plan-1/active/', '/WORKOUTS/plan-1/ACTIVE', '/quick-timer/active', '/quick-timer/active/'])(
    'suppresses a pending update throughout player route %s', (pathname) => {
      expect(shouldShowUpdatePrompt(true, pathname)).toBe(false)
    },
  )

  it('does not show a prompt without an update', () => {
    expect(shouldShowUpdatePrompt(false, '/workouts')).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'

import { selectRecentWorkoutSessions } from '@/features/home/utils/selectRecentWorkoutSessions'
import { workoutSession } from '@/test/workoutSessionBuilders'

describe('selectRecentWorkoutSessions', () => {
  it('selects the three latest completion times without changing repository order', () => {
    const sessions = [
      workoutSession({ id: 'oldest', completedAt: '2026-11-02T10:00:00Z' }),
      workoutSession({ id: 'latest', completedAt: '2026-11-02T14:00:00+01:00' }),
      workoutSession({ id: 'second', completedAt: '2026-11-02T12:00:00Z' }),
      workoutSession({ id: 'third', completedAt: '2026-11-02T11:00:00Z' }),
    ]
    const originalOrder = [...sessions]

    expect(selectRecentWorkoutSessions(sessions).map((session) => session.id)).toEqual(['latest', 'second', 'third'])
    expect(sessions).toEqual(originalOrder)
  })

  it('returns no sessions for empty history', () => {
    expect(selectRecentWorkoutSessions([])).toEqual([])
  })

  it('keeps all available sessions when fewer than three exist', () => {
    const session = workoutSession()
    expect(selectRecentWorkoutSessions([session])).toEqual([session])
  })
})

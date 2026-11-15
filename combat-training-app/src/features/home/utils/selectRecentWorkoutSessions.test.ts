import { describe, expect, it } from 'vitest'

import { selectRecentWorkoutSessions } from '@/features/home/utils/selectRecentWorkoutSessions'
import { workoutSession } from '@/test/workoutSessionBuilders'
import { manualWorkoutSession } from '@/test/manualWorkoutBuilder'

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
  it('orders all sources by the saved day before timestamps, including late manual entries', () => {
    const sessions = [workoutSession({ id: 'timed', workoutDate: '2026-11-17', completedAt: '2026-11-17T19:00:00Z' }),
      manualWorkoutSession({ id: 'latest', workoutDate: '2026-11-17', createdAt: '2026-11-17T20:00:00Z' }),
      manualWorkoutSession({ id: 'late-entry', workoutDate: '2026-11-16', createdAt: '2026-11-18T20:00:00Z' })]
    expect(selectRecentWorkoutSessions(sessions).map(({ id }) => id)).toEqual(['latest', 'timed', 'late-entry'])
  })

  it('keeps all available sessions when fewer than three exist', () => {
    const session = workoutSession()
    expect(selectRecentWorkoutSessions([session])).toEqual([session])
  })
})

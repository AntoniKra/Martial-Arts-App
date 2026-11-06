import { describe, expect, it } from 'vitest'

import { mapWorkoutSessionToHomeRecentSession } from '@/features/home/mappers/workoutSessionToHomeRecentSession'
import { mapWorkoutSessionToHistoryListItem } from '@/features/workouts/mappers/workoutSessionHistoryListItemMapper'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'

describe('workout session list mappings', () => {
  it.each(['completed', 'partial'] as const)('preserves %s status on home and history cards', (status) => {
    const session = workoutSession({ status })
    expect(mapWorkoutSessionToHomeRecentSession(session).status).toBe(status)
    expect(mapWorkoutSessionToHistoryListItem(session).status).toBe(status)
  })
  it('uses the same exercise completion on home and history and leaves missing ratings empty', () => {
    const session = workoutSession({
      workoutPlanNameSnapshot: 'Saved workout name',
      stepResults: [
        sessionStep({ playbackStepId: 'round-1', roundNumber: 1, roundCount: 3 }),
        sessionStep({ playbackStepId: 'round-2', roundNumber: 2, roundCount: 3 }),
        sessionStep({ playbackStepId: 'round-3', roundNumber: 3, roundCount: 3, outcome: 'skipped', performedDurationSeconds: 0 }),
        sessionStep({ playbackStepId: 'break', kind: 'break', workoutItemId: 'break' }),
      ],
    })

    expect(mapWorkoutSessionToHomeRecentSession(session)).toMatchObject({
      id: session.id,
      name: 'Saved workout name',
      durationLabelPl: '3 min',
      exerciseCompletionPercent: 0,
      rpe: null,
      averageRatingLabel: null,
    })
    expect(mapWorkoutSessionToHistoryListItem(session)).toMatchObject({
      plannedExercises: 1,
      completedExercises: 0,
      exerciseCompletionPercent: 0,
      plannedRounds: 3,
      completedRounds: 2,
      durationLabelPl: '3 min',
    })
  })
})

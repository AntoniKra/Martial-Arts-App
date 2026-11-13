import { describe, expect, it } from 'vitest'

import { calculateWorkoutSessionSummary } from '@/domain/workout-session/workoutSessionCalculations'
import type { WorkoutSessionStepOutcome } from '@/domain/workout-session/workoutSession.types'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'

describe('calculateWorkoutSessionSummary', () => {
  it.each<{
    outcomes: WorkoutSessionStepOutcome[]
    completedExercises: number
    completedRounds: number
  }>([
    { outcomes: ['skipped', 'skipped', 'skipped'], completedExercises: 0, completedRounds: 0 },
    { outcomes: ['completed', 'completed', 'completed'], completedExercises: 1, completedRounds: 3 },
    { outcomes: ['completed', 'partial', 'skipped'], completedExercises: 0, completedRounds: 1 },
    { outcomes: ['skipped', 'completed', 'completed'], completedExercises: 0, completedRounds: 2 },
    { outcomes: ['completed', 'completed', 'partial'], completedExercises: 0, completedRounds: 2 },
  ])('counts a three-round exercise with outcomes $outcomes', ({ outcomes, completedExercises, completedRounds }) => {
    const stepResults = outcomes.map((outcome, index) => sessionStep({
      playbackStepId: `round-${index + 1}`,
      roundNumber: index + 1,
      roundCount: 3,
      outcome,
      performedDurationSeconds: outcome === 'completed' ? 60 : outcome === 'partial' ? 30 : 0,
    }))

    expect(calculateWorkoutSessionSummary(workoutSession({ stepResults }))).toMatchObject({
      plannedExerciseCount: 1,
      completedExerciseCount: completedExercises,
      exerciseCompletionPercent: completedExercises * 100,
      plannedExerciseStepCount: 3,
      completedExerciseStepCount: completedRounds,
      plannedRoundCount: 3,
      completedRoundCount: completedRounds,
    })
  })

  it('groups by item ID rather than exercise name and excludes rests and breaks', () => {
    const stepResults = [
      sessionStep({ playbackStepId: 'round-1', roundNumber: 1, roundCount: 2 }),
      sessionStep({ playbackStepId: 'rest', kind: 'roundRest', outcome: 'skipped', performedDurationSeconds: 0 }),
      sessionStep({ playbackStepId: 'round-2', roundNumber: 2, roundCount: 2 }),
      sessionStep({ playbackStepId: 'break', workoutItemId: 'break-1', kind: 'break' }),
      sessionStep({ playbackStepId: 'continuous', workoutItemId: 'exercise-2', outcome: 'partial', performedDurationSeconds: 30 }),
    ]

    expect(calculateWorkoutSessionSummary(workoutSession({ stepResults }))).toMatchObject({
      activeDurationSeconds: 210,
      plannedStepCount: 5,
      completedStepCount: 3,
      partialStepCount: 1,
      skippedStepCount: 1,
      plannedExerciseCount: 2,
      completedExerciseCount: 1,
      exerciseCompletionPercent: 50,
      plannedRoundCount: 2,
      completedRoundCount: 2,
    })
  })

  it.each([
    { stepResults: [] },
    { stepResults: [sessionStep({ kind: 'break' }), sessionStep({ kind: 'roundRest' })] },
  ])(
    'returns zero exercise completion when there are no exercise steps ($stepResults)',
    ({ stepResults }) => {
      expect(calculateWorkoutSessionSummary(workoutSession({ stepResults }))).toMatchObject({
        plannedExerciseCount: 0,
        completedExerciseCount: 0,
        exerciseCompletionPercent: 0,
        plannedRoundCount: 0,
        completedRoundCount: 0,
      })
    },
  )
})

it('presents quick timer completion only in rounds and derives its progress from round completion', () => {
  const plan = workoutSession({ stepResults: [1, 2, 3].map((roundNumber) => sessionStep({ playbackStepId: `round-${roundNumber}`,
    roundNumber, roundCount: 3, outcome: roundNumber === 1 ? 'completed' : 'skipped', performedDurationSeconds: roundNumber === 1 ? 60 : 0 })) })
  const quick = { ...plan, source: 'quickTimer' as const, completion: { completed: 1, planned: 3, unit: 'round' as const } }
  expect(calculateWorkoutSessionSummary(quick)).toMatchObject({ completedExerciseCount: 0, plannedExerciseCount: 0,
    completedRoundCount: 1, plannedRoundCount: 3, exerciseCompletionPercent: 33 })
})

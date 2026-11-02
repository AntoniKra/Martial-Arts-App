import { describe, expect, it } from 'vitest'

import { calculateWorkoutPlanSummary } from '@/domain/workout/workoutCalculations'
import { block, continuousExercise, roundsExercise, workoutBreak } from '@/test/workoutBuilders'

describe('calculateWorkoutPlanSummary', () => {
  it('sums work, rest between rounds and standalone breaks across blocks', () => {
    const plan = {
      blocks: [
        block('warmup', [continuousExercise('rope', 300), workoutBreak('pause', 60)], 'warmup'),
        block('technique', [roundsExercise('jab-cross', 3, 120, 30), roundsExercise('slips', 2, 60, 0)]),
      ],
    }

    expect(calculateWorkoutPlanSummary(plan)).toEqual({
      blockCount: 2,
      exerciseCount: 3,
      plannedRoundCount: 5,
      activeWorkSeconds: 300 + 3 * 120 + 2 * 60,
      roundRestSeconds: 2 * 30,
      standaloneBreakSeconds: 60,
      totalRestSeconds: 2 * 30 + 60,
      estimatedTotalSeconds: 300 + 360 + 120 + 60 + 60,
    })
  })

  it('counts no rest for a single round', () => {
    const plan = { blocks: [block('b1', [roundsExercise('sparring', 1, 180, 60)])] }

    expect(calculateWorkoutPlanSummary(plan)).toMatchObject({ roundRestSeconds: 0, estimatedTotalSeconds: 180 })
  })

  it('returns zeros for an empty plan', () => {
    expect(calculateWorkoutPlanSummary({ blocks: [] })).toMatchObject({
      blockCount: 0,
      exerciseCount: 0,
      estimatedTotalSeconds: 0,
    })
  })
})

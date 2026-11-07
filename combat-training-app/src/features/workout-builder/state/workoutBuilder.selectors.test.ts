import { describe, expect, it } from 'vitest'

import { selectStartingExerciseConfiguration } from '@/features/workout-builder/state/workoutBuilder.selectors'
import { block, continuousExercise, roundsExercise, workoutBreak } from '@/test/workoutBuilders'

const threeByThreeWithMinuteRest = {
  mode: 'rounds',
  roundCount: 3,
  roundDurationSeconds: 180,
  restBetweenRoundsSeconds: 60,
  continuousDurationSeconds: 300,
} as const

describe('selectStartingExerciseConfiguration', () => {
  it('starts from 3 × 3:00 and 1:00 rest when the block is empty', () => {
    expect(selectStartingExerciseConfiguration([block('technique', [])], 'technique')).toEqual(
      threeByThreeWithMinuteRest,
    )
  })

  it('uses the previous rounds exercise in the same block', () => {
    const target = block('technique', [
      roundsExercise('previous', 4, 120, 45),
      workoutBreak('pause', 15),
    ])

    expect(selectStartingExerciseConfiguration([target], 'technique')).toEqual({
      mode: 'rounds',
      roundCount: 4,
      roundDurationSeconds: 120,
      restBetweenRoundsSeconds: 45,
      continuousDurationSeconds: 300,
    })
  })

  it('uses the previous rounds exercise from an earlier block', () => {
    const earlier = block('warmup', [roundsExercise('previous', 5, 90, 30)], 'warmup')
    const target = block('technique', [])

    expect(selectStartingExerciseConfiguration([earlier, target], 'technique')).toEqual({
      mode: 'rounds',
      roundCount: 5,
      roundDurationSeconds: 90,
      restBetweenRoundsSeconds: 30,
      continuousDurationSeconds: 300,
    })
  })

  it('keeps the earlier rounds settings when a continuous exercise sits between', () => {
    const target = block('technique', [
      roundsExercise('rounds', 2, 60, 30),
      continuousExercise('shadow', 90),
    ])

    expect(selectStartingExerciseConfiguration([target], 'technique')).toEqual({
      mode: 'continuous',
      roundCount: 2,
      roundDurationSeconds: 60,
      restBetweenRoundsSeconds: 30,
      continuousDurationSeconds: 90,
    })
  })

  it('starts in continuous mode when the last exercise in the block is continuous', () => {
    const target = block('technique', [
      roundsExercise('rounds', 4, 120, 45),
      continuousExercise('shadow', 90),
      workoutBreak('pause', 20),
    ])

    expect(selectStartingExerciseConfiguration([target], 'technique')).toEqual({
      mode: 'continuous',
      roundCount: 4,
      roundDurationSeconds: 120,
      restBetweenRoundsSeconds: 45,
      continuousDurationSeconds: 90,
    })
  })

  it('uses rounds from the previous block and continuous mode from the current block', () => {
    const earlier = block('warmup', [roundsExercise('rounds', 5, 90, 30)], 'warmup')
    const target = block('technique', [continuousExercise('shadow', 120)])

    expect(selectStartingExerciseConfiguration([earlier, target], 'technique')).toEqual({
      mode: 'continuous',
      roundCount: 5,
      roundDurationSeconds: 90,
      restBetweenRoundsSeconds: 30,
      continuousDurationSeconds: 120,
    })
  })

  it('starts in rounds mode with 5:00 when the block is empty after a continuous exercise', () => {
    const earlier = block('warmup', [continuousExercise('shadow', 90)], 'warmup')
    const target = block('technique', [])

    expect(selectStartingExerciseConfiguration([earlier, target], 'technique')).toEqual(
      threeByThreeWithMinuteRest,
    )
  })

  it('ignores rounds exercises that come after the insertion point', () => {
    const earlier = block('warmup', [roundsExercise('early', 2, 60, 30)], 'warmup')
    const target = block('technique', [])
    const later = block('bag', [roundsExercise('later', 5, 180, 90)], 'bag')

    expect(selectStartingExerciseConfiguration([earlier, target, later], 'technique')).toEqual({
      mode: 'rounds',
      roundCount: 2,
      roundDurationSeconds: 60,
      restBetweenRoundsSeconds: 30,
      continuousDurationSeconds: 300,
    })
  })
})

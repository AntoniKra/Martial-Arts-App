import { describe, expect, it } from 'vitest'

import { selectStartingRoundConfiguration } from '@/features/workout-builder/state/workoutBuilder.selectors'
import { block, continuousExercise, roundsExercise, workoutBreak } from '@/test/workoutBuilders'

const threeByThreeWithMinuteRest = {
  mode: 'rounds',
  roundCount: 3,
  roundDurationSeconds: 180,
  restBetweenRoundsSeconds: 60,
} as const

describe('selectStartingRoundConfiguration', () => {
  it.each([
    { label: 'the block is empty', items: [] },
    {
      label: 'the block has only a continuous exercise and a break',
      items: [continuousExercise('shadow', 90), workoutBreak('pause', 20)],
    },
  ])('starts from 3 × 3:00 and 1:00 rest when $label', ({ items }) => {
    expect(selectStartingRoundConfiguration([block('technique', items)], 'technique')).toEqual(
      threeByThreeWithMinuteRest,
    )
  })

  it('uses the previous rounds exercise in the same block', () => {
    const target = block('technique', [
      roundsExercise('previous', 4, 120, 45),
      workoutBreak('pause', 15),
    ])

    expect(selectStartingRoundConfiguration([target], 'technique')).toEqual({
      mode: 'rounds',
      roundCount: 4,
      roundDurationSeconds: 120,
      restBetweenRoundsSeconds: 45,
    })
  })

  it('uses the previous rounds exercise from an earlier block', () => {
    const earlier = block('warmup', [roundsExercise('previous', 5, 90, 30)], 'warmup')
    const target = block('technique', [])

    expect(selectStartingRoundConfiguration([earlier, target], 'technique')).toEqual({
      mode: 'rounds',
      roundCount: 5,
      roundDurationSeconds: 90,
      restBetweenRoundsSeconds: 30,
    })
  })

  it('keeps the earlier rounds settings when a continuous exercise sits between', () => {
    const target = block('technique', [
      roundsExercise('rounds', 2, 60, 30),
      continuousExercise('shadow', 90),
    ])

    expect(selectStartingRoundConfiguration([target], 'technique')).toEqual({
      mode: 'rounds',
      roundCount: 2,
      roundDurationSeconds: 60,
      restBetweenRoundsSeconds: 30,
    })
  })

  it('ignores rounds exercises that come after the insertion point', () => {
    const earlier = block('warmup', [roundsExercise('early', 2, 60, 30)], 'warmup')
    const target = block('technique', [])
    const later = block('bag', [roundsExercise('later', 5, 180, 90)], 'bag')

    expect(selectStartingRoundConfiguration([earlier, target, later], 'technique')).toEqual({
      mode: 'rounds',
      roundCount: 2,
      roundDurationSeconds: 60,
      restBetweenRoundsSeconds: 30,
    })
  })
})

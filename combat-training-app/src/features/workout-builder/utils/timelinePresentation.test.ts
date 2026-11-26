import { describe, expect, it } from 'vitest'

import { continuousExercise, roundsExercise, workoutBreak } from '@/test/workoutBuilders'
import {
  formatExerciseParams,
  splitTrailingBreaks,
  summarizeBlockTime,
} from '@/features/workout-builder/utils/timelinePresentation'

describe('summarizeBlockTime', () => {
  it('splits work from rests between rounds and standalone breaks', () => {
    const summary = summarizeBlockTime({
      items: [roundsExercise('a', 3, 180, 60), workoutBreak('pause', 120), continuousExercise('b', 60)],
    })

    expect(summary).toMatchObject({ workSeconds: 600, restSeconds: 240, totalSeconds: 840 })
    expect(summary.workPercent).toBeCloseTo((600 / 840) * 100)
    expect(summary.workPercent + summary.restPercent).toBeCloseTo(100)
  })

  it('returns an empty ratio for a block without time', () => {
    expect(summarizeBlockTime({ items: [] })).toEqual({
      workSeconds: 0, restSeconds: 0, totalSeconds: 0, workPercent: 0, restPercent: 0,
    })
  })

  it('does not count rest after a single round', () => {
    expect(summarizeBlockTime({ items: [roundsExercise('a', 1, 180, 60)] })).toMatchObject({
      workSeconds: 180, restSeconds: 0, workPercent: 100, restPercent: 0,
    })
  })
})

describe('formatExerciseParams', () => {
  it('shows rounds, round time and rest', () => {
    expect(formatExerciseParams(roundsExercise('a', 3, 180, 60).configuration, 'Ciągłe')).toBe('3 × 3:00 / 1:00')
  })

  it('omits the rest for a single round', () => {
    expect(formatExerciseParams(roundsExercise('a', 1, 150, 60).configuration, 'Ciągłe')).toBe('1 × 2:30')
  })

  it('shows a zero rest when several rounds have no rest', () => {
    expect(formatExerciseParams(roundsExercise('a', 2, 60, 0).configuration, 'Ciągłe')).toBe('2 × 1:00 / 0:00')
  })

  it('shows continuous work with its duration', () => {
    expect(formatExerciseParams(continuousExercise('a', 300).configuration, 'Ciągłe')).toBe('Ciągłe · 5:00')
  })
})

describe('splitTrailingBreaks', () => {
  it('keeps breaks between exercises inside and moves closing breaks out, with positions', () => {
    const items = [roundsExercise('a', 3, 180, 60), workoutBreak('mid', 30), continuousExercise('b', 60),
      workoutBreak('end-1', 60), workoutBreak('end-2', 90)]

    const { inside, trailing } = splitTrailingBreaks(items)

    expect(inside.map(({ item, position }) => [item.id, position])).toEqual([['a', 1], ['mid', 2], ['b', 3]])
    expect(trailing.map(({ item, position }) => [item.id, position])).toEqual([['end-1', 4], ['end-2', 5]])
  })

  it('treats a block of breaks only as closing breaks', () => {
    const { inside, trailing } = splitTrailingBreaks([workoutBreak('only', 60)])

    expect(inside).toEqual([])
    expect(trailing).toHaveLength(1)
  })

  it('returns nothing for an empty block', () => {
    expect(splitTrailingBreaks([])).toEqual({ inside: [], trailing: [] })
  })
})

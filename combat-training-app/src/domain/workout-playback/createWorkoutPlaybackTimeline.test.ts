import { describe, expect, it } from 'vitest'

import { createWorkoutPlaybackTimeline, tryCreateWorkoutPlaybackTimeline } from '@/domain/workout-playback/createWorkoutPlaybackTimeline'
import { block, continuousExercise, roundsExercise, workoutBreak, workoutPlan, workoutPlanAtSessionStepLimit } from '@/test/workoutBuilders'

describe('createWorkoutPlaybackTimeline', () => {
  it('creates all 500 steps at the session limit', () => {
    const plan = workoutPlanAtSessionStepLimit()

    expect(createWorkoutPlaybackTimeline(plan).steps).toHaveLength(500)
  })

  it('rejects a timeline of 501 steps without returning a partial timeline', () => {
    const plan = workoutPlanAtSessionStepLimit()
    plan.blocks.push(block('extra', [continuousExercise('extra', 60)]))

    expect(tryCreateWorkoutPlaybackTimeline(plan)).toEqual({ ok: false, stepCount: 501 })
    expect(() => createWorkoutPlaybackTimeline(plan)).toThrow(RangeError)
  })

  it('interleaves rounds with rest and adds no rest after the last round', () => {
    const plan = workoutPlan([block('b1', [roundsExercise('jab-cross', 3, 60, 30)])])

    const timeline = createWorkoutPlaybackTimeline(plan)

    expect(timeline.steps.map((step) => step.kind)).toEqual([
      'exercise',
      'roundRest',
      'exercise',
      'roundRest',
      'exercise',
    ])
    expect(timeline.steps.filter((step) => step.kind === 'exercise').map((step) => step.roundNumber)).toEqual([1, 2, 3])
    expect(timeline.totalDurationSeconds).toBe(3 * 60 + 2 * 30)
  })

  it('creates no rest steps when the rest between rounds is zero', () => {
    const plan = workoutPlan([block('b1', [roundsExercise('bag', 2, 120, 0)])])

    const timeline = createWorkoutPlaybackTimeline(plan)

    expect(timeline.steps.map((step) => step.kind)).toEqual(['exercise', 'exercise'])
  })

  it('keeps block and item order, including continuous exercises and breaks', () => {
    const plan = workoutPlan([
      block('warmup', [continuousExercise('rope', 300), workoutBreak('pause', 60)], 'warmup'),
      block('pads', [roundsExercise('pads-1', 1, 180, 60)], 'pads'),
    ])

    const timeline = createWorkoutPlaybackTimeline(plan)

    expect(timeline.steps.map((step) => [step.kind, step.blockIndex, step.durationSeconds])).toEqual([
      ['exercise', 0, 300],
      ['break', 0, 60],
      ['exercise', 1, 180],
    ])
    expect(timeline.steps[1].name).toBe('Przerwa')
    expect(timeline.totalDurationSeconds).toBe(540)
  })

  it('gives every step a unique id', () => {
    const plan = workoutPlan([block('b1', [roundsExercise('a', 3, 60, 30), roundsExercise('b', 2, 60, 30)])])

    const ids = createWorkoutPlaybackTimeline(plan).steps.map((step) => step.id)

    expect(new Set(ids).size).toBe(ids.length)
  })
})

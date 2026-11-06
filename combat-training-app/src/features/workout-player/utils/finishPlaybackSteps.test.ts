import { describe, expect, it } from 'vitest'

import { calculateWorkoutSessionDurations } from '@/domain/workout-session/workoutSessionDefinitions'
import { createWorkoutPlaybackTimeline } from '@/features/workout-player/utils/createWorkoutPlaybackTimeline'
import { finalizePlaybackSteps, getNextWorkoutItemStepIndex } from '@/features/workout-player/utils/finishPlaybackSteps'
import { mergeTrackedStepResult, type TrackedStepResult } from '@/features/workout-player/utils/mergeTrackedStepResult'
import { block, continuousExercise, roundsExercise, workoutBreak, workoutPlan } from '@/test/workoutBuilders'

const timeline = createWorkoutPlaybackTimeline(workoutPlan([
  block('b1', [roundsExercise('rounds', 3, 60, 30), workoutBreak('break', 15)]),
  block('b2', [continuousExercise('continuous', 60)]),
]))

describe('finishing an exercise', () => {
  it('skips the current and remaining rounds and rests, preserving completed rounds and real duration', () => {
    const targetIndex = getNextWorkoutItemStepIndex(timeline.steps, 2)
    expect(targetIndex).toBe(5)
    expect(timeline.steps[targetIndex].kind).toBe('break')
    const events = finalizePlaybackSteps(timeline.steps, 2, targetIndex, 40, 20_000, 'finishExercise')
    expect(events.map((event) => event.type === 'stepFinalized' && [event.stepIndex, event.outcome, event.performedDurationSeconds, event.performedDurationMs]))
      .toEqual([[2, 'skipped', 0, 20_000], [3, 'skipped', 0, 0], [4, 'skipped', 0, 0]])
    // Results recorded before this command stay completed, including previously repeated rounds.
    const completed = { stepIndex: 0, playbackStepId: timeline.steps[0].id, plannedDurationSeconds: 60, performedDurationSeconds: 60, outcome: 'completed' as const }
    const results = new Map<string, TrackedStepResult>([[completed.playbackStepId, completed]])
    for (const event of events) {
      if (event.type !== 'stepFinalized') throw new Error('Expected a finalized step')
      const incoming = { ...event, plannedDurationSeconds: timeline.steps[event.stepIndex].durationSeconds }
      results.set(event.playbackStepId, mergeTrackedStepResult(results.get(event.playbackStepId), incoming))
    }
    expect(results.get(completed.playbackStepId)).toEqual(completed)
    expect(calculateWorkoutSessionDurations(events.map((event) => {
      if (event.type !== 'stepFinalized') throw new Error('Expected a finalized step')
      const step = timeline.steps[event.stepIndex]
      return { kind: step.kind, blockType: step.blockType, outcome: event.outcome, performedDurationMs: event.performedDurationMs }
    }))).toEqual({ durationSeconds: 20, workSeconds: 0, sparringSeconds: 0 })
  })

  it('finishes the same item during round rest and includes elapsed rest without future time', () => {
    expect(getNextWorkoutItemStepIndex(timeline.steps, 1)).toBe(5)
    const events = finalizePlaybackSteps(timeline.steps, 1, 5, 20, 10_000, 'finishExercise')
    expect(events[0]).toMatchObject({ outcome: 'partial', performedDurationSeconds: 10, performedDurationMs: 10_000 })
    expect(events.slice(1).every((event) => event.type === 'stepFinalized' && event.outcome === 'skipped' && event.performedDurationMs === 0)).toBe(true)
  })

  it('finishes a continuous exercise at the end of the timeline', () => {
    expect(getNextWorkoutItemStepIndex(timeline.steps, 6)).toBe(timeline.steps.length)
    expect(finalizePlaybackSteps(timeline.steps, 6, 7, 5, 55_000, 'finishExercise'))
      .toEqual([expect.objectContaining({ stepIndex: 6, outcome: 'skipped', performedDurationSeconds: 0, performedDurationMs: 55_000 })])
  })

  it('ends early with a result for every remaining step including later items and blocks', () => {
    const events = finalizePlaybackSteps(timeline.steps, 2, timeline.steps.length, 59, 1_000, 'endEarly')
    expect(events).toHaveLength(timeline.steps.length - 2)
    expect(events[0]).toMatchObject({ outcome: 'skipped', performedDurationSeconds: 0, performedDurationMs: 1_000 })
    expect(events.slice(1).every((event) => event.type === 'stepFinalized' && event.outcome === 'skipped' && event.performedDurationSeconds === 0 && event.performedDurationMs === 0)).toBe(true)
  })
})

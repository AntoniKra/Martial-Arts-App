import { describe, expect, it } from 'vitest'

import {
  calculateWorkoutDate,
  calculateWorkoutSessionCategory,
  calculateWorkoutSessionDurations,
  createPlanWorkoutSession,
} from '@/domain/workout-session/workoutSessionDefinitions'
import { calculateWorkoutSessionSummary } from '@/domain/workout-session/workoutSessionCalculations'
import type { WorkoutBlockType } from '@/domain/workout/workout.types'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'

const exercise = sessionStep()
const rest = sessionStep({ playbackStepId: 'rest', kind: 'roundRest' })
const skipped = sessionStep({ playbackStepId: 'skipped', workoutItemId: 'exercise-2', outcome: 'skipped', performedDurationSeconds: 0 })

function build(steps = [exercise], endedEarly = false) {
  return createPlanWorkoutSession(workoutSession({ stepResults: steps }), {
    timezone: 'Europe/Warsaw',
    blockTypes: steps.map((step) => step.blockType),
    endedEarly,
    durations: calculateWorkoutSessionDurations(steps.map((step) => ({
      ...step, performedDurationMs: step.performedDurationSeconds * 1000,
    }))),
  })
}

describe('plan journal entries', () => {
  it('saves a completed plan with exercise completion independent of rounds and time', () => {
    const result = build([
      sessionStep({ playbackStepId: 'round-1', roundNumber: 1, roundCount: 2 }),
      rest,
      sessionStep({ playbackStepId: 'round-2', roundNumber: 2, roundCount: 2 }),
      sessionStep({ playbackStepId: 'continuous', workoutItemId: 'exercise-2' }),
    ])
    expect(result).toMatchObject({ kind: 'save', session: {
      source: 'plan', status: 'completed', durationSeconds: 240, workSeconds: 180,
      sparringSeconds: 0, completion: { completedExercises: 2, plannedExercises: 2 },
      category: 'technique', workoutDate: '2026-11-02', timezone: 'Europe/Warsaw',
    } })
  })

  it.each(['break', 'roundRest'] as const)('does not lower status for a skipped %s', (kind) => {
    expect(build([exercise, { ...rest, kind, performedDurationSeconds: 0, outcome: 'skipped' }]))
      .toMatchObject({ kind: 'save', session: { status: 'completed', durationSeconds: 60 } })
  })

  it.each([0, 15])('marks a skipped exercise with %s seconds of work as partial when other work was done', (performedDurationSeconds) => {
    expect(build([exercise, { ...skipped, performedDurationSeconds, outcome: performedDurationSeconds === 0 ? 'skipped' : 'partial' }]))
      .toMatchObject({ kind: 'save', session: {
        status: 'partial', completion: { completedExercises: 1, plannedExercises: 2 },
      } })
  })

  it('marks an early finish as partial even if all recorded exercise steps were completed', () => {
    expect(build([exercise], true)).toMatchObject({ kind: 'save', session: { status: 'partial' } })
  })

  it.each([{ steps: [] }, { steps: [skipped] }, { steps: [skipped, rest] }])('explicitly rejects a run without work ($steps)', ({ steps }) => {
    expect(build(steps)).toEqual({ kind: 'noWork' })
  })

  it('counts sparring only during exercise steps in sparring blocks', () => {
    const result = build([
      { ...exercise, blockType: 'sparring' },
      { ...rest, blockType: 'sparring' },
      sessionStep({ playbackStepId: 'bag', workoutItemId: 'bag', blockType: 'bag' }),
    ])
    expect(result).toMatchObject({ kind: 'save', session: {
      durationSeconds: 180, workSeconds: 120, sparringSeconds: 60, category: 'mixed',
    } })
  })

  it('includes repeated attempts in time without increasing completion', () => {
    // A 10-second attempt, a repeated full round, a rest, and the next exercise.
    // Pauses are not attempts, so the 90 seconds paused contribute nothing.
    const durations = calculateWorkoutSessionDurations([
      { ...exercise, performedDurationMs: 10_000 },
      { ...exercise, performedDurationMs: 60_000 },
      { ...rest, performedDurationMs: 30_000 },
      { ...exercise, performedDurationMs: 60_000 },
    ])
    const result = createPlanWorkoutSession(workoutSession({ stepResults: [exercise] }), {
      timezone: 'Europe/Warsaw', blockTypes: ['technique'], endedEarly: false, durations,
    })
    expect(result).toMatchObject({ kind: 'save', session: {
      durationSeconds: 160, workSeconds: 130,
      completion: { completedExercises: 1, plannedExercises: 1 },
    } })
    if (result.kind !== 'save') throw new Error('Expected a saved entry')
    expect(calculateWorkoutSessionSummary(result.session).activeDurationSeconds).toBe(160)
  })

  it('preserves subsecond work with no minimum duration and sums short repeated attempts', () => {
    const durations = calculateWorkoutSessionDurations([
      { ...exercise, performedDurationMs: 400 },
      { ...exercise, performedDurationMs: 400 },
    ])
    expect(durations).toEqual({ durationSeconds: 0.8, workSeconds: 0.8, sparringSeconds: 0 })
    expect(createPlanWorkoutSession(workoutSession({ stepResults: [skipped] }), {
      timezone: 'Europe/Warsaw', blockTypes: ['technique'], endedEarly: false, durations,
    })).toMatchObject({ kind: 'save', session: { status: 'partial', workSeconds: 0.8 } })
  })

  it.each<{ blocks: WorkoutBlockType[]; category: string }>([
    { blocks: ['technique', 'technique'], category: 'technique' },
    { blocks: ['warmup', 'sparring'], category: 'sparring' },
    { blocks: ['warmup', 'bag', 'bag'], category: 'bag' },
    { blocks: ['technique', 'pads'], category: 'mixed' },
    { blocks: ['warmup'], category: 'mixed' },
    { blocks: [], category: 'mixed' },
  ])('categorizes $blocks as $category', ({ blocks, category }) => {
    expect(calculateWorkoutSessionCategory(blocks)).toBe(category)
  })

  it('uses the local start day for a workout crossing midnight, independent of machine timezone', () => {
    const fields = workoutSession({
      startedAt: '2026-11-02T22:30:00Z', completedAt: '2026-11-02T23:30:00Z', stepResults: [exercise],
    })
    const result = createPlanWorkoutSession(fields, {
      timezone: 'Europe/Warsaw', blockTypes: ['technique'], endedEarly: false,
      durations: { durationSeconds: 3600, workSeconds: 3600, sparringSeconds: 0 },
    })
    expect(result).toMatchObject({ kind: 'save', session: { workoutDate: '2026-11-02', timezone: 'Europe/Warsaw' } })
    expect(calculateWorkoutDate(fields.completedAt, 'Europe/Warsaw')).toBe('2026-11-03')
    expect(calculateWorkoutDate('2026-11-03T00:30:00Z', 'America/Los_Angeles')).toBe('2026-11-02')
    expect(calculateWorkoutDate('2026-11-03T00:30:00Z', 'Asia/Tokyo')).toBe('2026-11-03')
  })
})

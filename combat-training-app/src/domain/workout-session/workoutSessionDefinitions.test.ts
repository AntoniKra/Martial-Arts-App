import { describe, expect, it } from 'vitest'

import {
  calculateWorkoutDate,
  calculateWorkoutSessionCategory,
  calculateWorkoutSessionDurations,
  calculateWorkoutSessionSparring,
  createPlanWorkoutSession,
} from '@/domain/workout-session/workoutSessionDefinitions'
import { calculateWorkoutSessionSummary } from '@/domain/workout-session/workoutSessionCalculations'
import type { WorkoutBlockType } from '@/domain/workout/workout.types'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'
import { block } from '@/test/workoutBuilders'

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
  it('snapshots each sparring block, counts only completed planned rounds and includes empty blocks', () => {
    const blocks = [
      { ...block('sparring', [], 'sparring'), blockType: 'sparring' as const, sparringIntensity: 'hard' as const },
      block('empty', [], 'sparring'), block('bag', [], 'bag'),
    ]
    const steps = [
      sessionStep({ blockId: 'sparring', blockType: 'sparring', roundNumber: 1, roundCount: 2 }),
      sessionStep({ blockId: 'sparring', blockType: 'sparring', playbackStepId: 'skipped', roundNumber: 2, roundCount: 2, outcome: 'skipped', performedDurationSeconds: 0 }),
      sessionStep({ blockId: 'sparring', blockType: 'sparring', playbackStepId: 'continuous' }),
      sessionStep({ blockId: 'sparring', blockType: 'sparring', playbackStepId: 'rest', kind: 'roundRest' }),
      sessionStep({ blockId: 'bag', playbackStepId: 'bag', roundNumber: 1, roundCount: 1 }),
    ]
    expect(calculateWorkoutSessionSparring(blocks, steps)).toEqual([
      { blockId: 'sparring', intensity: 'hard', rounds: 1 }, { blockId: 'empty', intensity: null, rounds: 0 },
    ])
    const result = createPlanWorkoutSession(workoutSession({ stepResults: steps }), {
      timezone: 'Europe/Warsaw', blockTypes: ['sparring'], blocks, endedEarly: false,
      durations: { durationSeconds: 240, workSeconds: 180, sparringSeconds: 120 },
    })
    expect(result).toMatchObject({ kind: 'save', session: { sparring: [
      { blockId: 'sparring', intensity: 'hard', rounds: 1 }, { blockId: 'empty', intensity: null, rounds: 0 },
    ], rpe: null, rpeRecordedAt: null, focusRatings: [], exerciseRatings: [],
    createdAt: '2026-11-02T10:00:00.000Z', updatedAt: '2026-11-02T10:00:00.000Z' } })
  })
  it('saves a completed plan with exercise completion independent of rounds and time', () => {
    const result = build([
      sessionStep({ playbackStepId: 'round-1', roundNumber: 1, roundCount: 2 }),
      rest,
      sessionStep({ playbackStepId: 'round-2', roundNumber: 2, roundCount: 2 }),
      sessionStep({ playbackStepId: 'continuous', workoutItemId: 'exercise-2' }),
    ])
    expect(result).toMatchObject({ kind: 'save', session: {
      source: 'plan', status: 'completed', durationSeconds: 240, workSeconds: 180,
      sparringSeconds: 0, completion: { completed: 2, planned: 2, unit: 'exercise' },
      category: 'technique', workoutDate: '2026-11-02', timezone: 'Europe/Warsaw',
    } })
  })

  it.each(['break', 'roundRest'] as const)('does not lower status for a skipped %s', (kind) => {
    expect(build([exercise, { ...rest, kind, performedDurationSeconds: 0, outcome: 'skipped' }]))
      .toMatchObject({ kind: 'save', session: { status: 'completed', durationSeconds: 60 } })
  })

  it.each([0, 15])('excludes a legacy unfinished exercise with %s elapsed seconds from work', (performedDurationSeconds) => {
    expect(build([exercise, { ...skipped, performedDurationSeconds, outcome: performedDurationSeconds === 0 ? 'skipped' : 'partial' }]))
      .toMatchObject({ kind: 'save', session: {
        status: 'partial', durationSeconds: 60 + performedDurationSeconds, workSeconds: 60,
        completion: { completed: 1, planned: 2, unit: 'exercise' },
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
    // A skipped 10-second attempt, the same round completed twice, and a rest.
    // Pauses are not attempts, so the 90 seconds paused contribute nothing.
    const durations = calculateWorkoutSessionDurations([
      { ...exercise, performedDurationMs: 10_000, outcome: 'skipped' },
      { ...exercise, performedDurationMs: 60_000 },
      { ...rest, performedDurationMs: 30_000 },
      { ...exercise, performedDurationMs: 60_000 },
    ])
    const result = createPlanWorkoutSession(workoutSession({ stepResults: [exercise] }), {
      timezone: 'Europe/Warsaw', blockTypes: ['technique'], endedEarly: false, durations,
    })
    expect(result).toMatchObject({ kind: 'save', session: {
      durationSeconds: 160, workSeconds: 120,
      completion: { completed: 1, planned: 1, unit: 'exercise' },
    } })
    if (result.kind !== 'save') throw new Error('Expected a saved entry')
    expect(calculateWorkoutSessionSummary(result.session).activeDurationSeconds).toBe(160)
  })

  it('retains subsecond attempts in duration but rejects a run without a completed exercise', () => {
    const durations = calculateWorkoutSessionDurations([
      { ...exercise, performedDurationMs: 400, outcome: 'skipped' },
      { ...exercise, performedDurationMs: 400, outcome: 'skipped' },
    ])
    expect(durations).toEqual({ durationSeconds: 0.8, workSeconds: 0, sparringSeconds: 0 })
    expect(createPlanWorkoutSession(workoutSession({ stepResults: [skipped] }), {
      timezone: 'Europe/Warsaw', blockTypes: ['technique'], endedEarly: false, durations,
    })).toEqual({ kind: 'noWork' })
  })

  it('counts only completed sparring rounds as work, including each completed repetition', () => {
    expect(calculateWorkoutSessionDurations([
      { kind: 'exercise', blockType: 'sparring', performedDurationMs: 120_000, outcome: 'skipped' },
      { kind: 'exercise', blockType: 'sparring', performedDurationMs: 180_000, outcome: 'completed' },
      { kind: 'exercise', blockType: 'sparring', performedDurationMs: 180_000, outcome: 'completed' },
      { kind: 'roundRest', blockType: 'sparring', performedDurationMs: 15_000, outcome: 'partial' },
      { kind: 'break', blockType: 'sparring', performedDurationMs: 10_000, outcome: 'partial' },
    ])).toEqual({ durationSeconds: 505, workSeconds: 360, sparringSeconds: 360 })
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

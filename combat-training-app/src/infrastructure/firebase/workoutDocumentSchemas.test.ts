import { describe, expect, it } from 'vitest'
import { workoutPlanDocumentSchema, workoutSessionDocumentSchema } from './workoutDocumentSchemas'
import { block, continuousExercise, workoutPlan } from '@/test/workoutBuilders'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'

const plan = { ...workoutPlan([block('block', [continuousExercise('exercise', 60)], 'sparring')]), schemaVersion: 1 }
const session = { ...workoutSession({ stepResults: [sessionStep()] }), schemaVersion: 1 }
const { workoutPlanId: _planId, workoutPlanNameSnapshot: _name, focusRatings: _focus, exerciseRatings: _ratings, ...timed } = session
const quickTimer = { ...timed, source: 'quickTimer', completion: { completed: 1, planned: 1, unit: 'round' } }
const { startedAt: _start, completedAt: _end, stepResults: _steps, ...common } = timed
const manual = { ...common, source: 'manual', completion: null, workSeconds: null, sparringSeconds: null }

describe('Firestore document schemas', () => {
  it('accepts a plan with sparring defaults and focusSkillId', () => {
    expect(workoutPlanDocumentSchema.parse(plan)).toEqual(plan)
  })
  it.each([session, quickTimer, manual])('accepts $source sessions with exactly their source fields', (value) => {
    expect(workoutSessionDocumentSchema.parse(value)).toEqual(value)
  })
  it.each([0, 2, '1'])('rejects schemaVersion %s', (schemaVersion) => {
    expect(workoutPlanDocumentSchema.safeParse({ ...plan, schemaVersion }).success).toBe(false)
    expect(workoutSessionDocumentSchema.safeParse({ ...session, schemaVersion }).success).toBe(false)
  })
  it('rejects extra fields at the document and nested boundaries', () => {
    expect(workoutPlanDocumentSchema.safeParse({ ...plan, extra: true }).success).toBe(false)
    expect(workoutSessionDocumentSchema.safeParse({ ...session, extra: true }).success).toBe(false)
    expect(workoutSessionDocumentSchema.safeParse({ ...manual, startedAt: session.startedAt }).success).toBe(false)
    expect(workoutPlanDocumentSchema.safeParse({ ...plan, blocks: [{ ...plan.blocks[0], extra: true }] }).success).toBe(false)
    expect(workoutSessionDocumentSchema.safeParse({ ...session, stepResults: [{ ...session.stepResults[0], extra: true }] }).success).toBe(false)
  })
  it('requires canonical UTC milliseconds, valid dates and a real timezone', () => {
    expect(workoutPlanDocumentSchema.safeParse({ ...plan, createdAt: '2026-11-02T10:00:00Z' }).success).toBe(false)
    expect(workoutSessionDocumentSchema.safeParse({ ...session, workoutDate: '2026-02-30' }).success).toBe(false)
    expect(workoutSessionDocumentSchema.safeParse({ ...session, timezone: 'Unknown/Place' }).success).toBe(false)
    expect(workoutSessionDocumentSchema.safeParse({ ...session, completedAt: '2026-01-01T00:00:00.000Z' }).success).toBe(false)
  })
  it('checks completion units, bounds and source-specific status', () => {
    expect(workoutSessionDocumentSchema.safeParse({ ...session, completion: quickTimer.completion }).success).toBe(false)
    expect(workoutSessionDocumentSchema.safeParse({ ...session, completion: { completed: 2, planned: 1, unit: 'exercise' } }).success).toBe(false)
    expect(workoutSessionDocumentSchema.safeParse({ ...manual, status: 'partial' }).success).toBe(false)
  })
  it('rejects impossible step results, duplicates and excessive list lengths', () => {
    expect(workoutSessionDocumentSchema.safeParse({ ...session, stepResults: [sessionStep({ performedDurationSeconds: 0 })] }).success).toBe(false)
    expect(workoutSessionDocumentSchema.safeParse({ ...session, stepResults: [sessionStep(), sessionStep()] }).success).toBe(false)
    expect(workoutSessionDocumentSchema.safeParse({ ...session, stepResults: Array.from({ length: 501 }, (_, i) => sessionStep({ playbackStepId: String(i) })) }).success).toBe(false)
  })
  it('accepts a plan and a session that include a cooldown block', () => {
    const cooldownPlan = {
      ...workoutPlan([
        block('warmup', [continuousExercise('warmup', 60)], 'warmup'),
        block('bag', [continuousExercise('bag', 60)], 'bag'),
        block('cooldown', [continuousExercise('stretch', 120)], 'cooldown'),
      ]),
      schemaVersion: 1,
    }
    const cooldownSession = {
      ...workoutSession({
        stepResults: [
          sessionStep({ playbackStepId: 'warmup', workoutItemId: 'warmup', blockId: 'warmup', blockType: 'warmup' }),
          sessionStep({ playbackStepId: 'bag', workoutItemId: 'bag', blockId: 'bag', blockType: 'bag' }),
          sessionStep({ playbackStepId: 'stretch', workoutItemId: 'stretch', blockId: 'cooldown', blockType: 'cooldown' }),
        ],
      }),
      schemaVersion: 1,
    }

    expect(workoutPlanDocumentSchema.parse(cooldownPlan)).toEqual(cooldownPlan)
    expect(cooldownSession.category).toBe('bag')
    expect(workoutSessionDocumentSchema.parse(cooldownSession)).toEqual(cooldownSession)
    expect(workoutSessionDocumentSchema.safeParse({ ...cooldownSession, category: 'cooldown' }).success).toBe(false)
  })
  it('checks feedback ranges and sparring data', () => {
    expect(workoutSessionDocumentSchema.safeParse({ ...session, rpe: 11, rpeRecordedAt: session.completedAt }).success).toBe(false)
    expect(workoutSessionDocumentSchema.safeParse({ ...session, rpe: 5 }).success).toBe(false)
    expect(workoutSessionDocumentSchema.safeParse({ ...session, sparring: [{ blockId: 'block', intensity: 'hard', rounds: -1 }] }).success).toBe(false)
  })
})

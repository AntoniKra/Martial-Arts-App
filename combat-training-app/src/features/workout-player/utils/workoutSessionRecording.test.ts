import { describe, expect, it } from 'vitest'
import type { WorkoutSessionRecording } from '@/application/workout/activeWorkoutRepository'
import { createWorkoutPlaybackTimeline } from '@/domain/workout-playback/createWorkoutPlaybackTimeline'
import { block, roundsExercise, workoutPlan } from '@/test/workoutBuilders'
import { workoutSessionDocumentSchema } from '@/infrastructure/firebase/workoutDocumentSchemas'
import { buildRecordedWorkoutSession, recordFinalizedStep } from './workoutSessionRecording'
import { mergeTrackedStepResult } from './mergeTrackedStepResult'

describe('recording adjusted targets', () => {
  it.each([165, 195])('saves %s seconds as both completed target and work without changing completion', (target) => {
    const plan = workoutPlan([block('bag', [roundsExercise('jab', 1, 180, 0)], 'sparring')])
    const steps = createWorkoutPlaybackTimeline(plan).steps
    const initial: WorkoutSessionRecording = { timezone: 'Europe/Warsaw', sessionId: 'session', startedAt: '2026-11-12T10:00:00.000Z',
      stepResults: [], attempts: [], exerciseRatings: [], focusRatings: [], completedAt: null, endedEarly: false }
    const recording = recordFinalizedStep(initial, steps, { type: 'stepFinalized', stepIndex: 0, playbackStepId: steps[0].id,
      plannedDurationSeconds: target, performedDurationSeconds: target, performedDurationMs: target * 1000, outcome: 'completed', reason: 'elapsed' })
    const result = buildRecordedWorkoutSession(plan, steps, recording, Date.parse(initial.startedAt!) + target * 1000, false)
    expect(result.kind).toBe('save')
    if (result.kind !== 'save') throw new Error('Expected a saved session')
    expect(result.session).toMatchObject({ status: 'completed', durationSeconds: target, workSeconds: target, sparringSeconds: target,
      completion: { completed: 1, planned: 1, unit: 'exercise' },
      stepResults: [{ plannedDurationSeconds: target, performedDurationSeconds: target, outcome: 'completed' }] })
    expect(workoutSessionDocumentSchema.safeParse({ ...result.session, schemaVersion: 1 }).success).toBe(true)
    const invalid = { ...result.session, schemaVersion: 1, stepResults: [{ ...result.session.stepResults[0], performedDurationSeconds: target - 1 }] }
    expect(workoutSessionDocumentSchema.safeParse(invalid).success).toBe(false)
    expect(steps[0].durationSeconds).toBe(180)
  })

  it('preserves a completed corrected result when a restarted attempt is skipped', () => {
    const completed = { stepIndex: 0, playbackStepId: 'round', plannedDurationSeconds: 195, performedDurationSeconds: 195, outcome: 'completed' as const }
    expect(mergeTrackedStepResult(completed, { ...completed, plannedDurationSeconds: 180, performedDurationSeconds: 0, outcome: 'skipped' })).toEqual(completed)
  })

  it('keeps the target belonging to the best partial attempt', () => {
    const previous = { stepIndex: 0, playbackStepId: 'rest', plannedDurationSeconds: 30, performedDurationSeconds: 20, outcome: 'partial' as const }
    const next = { ...previous, plannedDurationSeconds: 60, performedDurationSeconds: 40 }
    expect(mergeTrackedStepResult(previous, next)).toEqual(next)
    expect(mergeTrackedStepResult(next, previous)).toEqual(next)
  })
})

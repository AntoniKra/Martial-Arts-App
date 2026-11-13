import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveWorkout } from '@/application/workout/activeWorkoutRepository'
import { block, roundsExercise, workoutPlan } from '@/test/workoutBuilders'
import { ACTIVE_WORKOUT_STORAGE_PREFIX, createActiveWorkoutRepository } from './activeWorkoutStorage'
import { createWorkoutPlaybackTimeline } from '@/domain/workout-playback/createWorkoutPlaybackTimeline'

const now = Date.parse('2026-11-08T10:00:00.000Z')
function snapshot(): ActiveWorkout {
  return { schemaVersion: 1, plan: workoutPlan([block('bag', [roundsExercise('jab', 3, 120, 30)], 'bag')]),
    playback: { status: 'running', currentStepIndex: 0, remainingSeconds: 80, stepRevision: 1 },
    deadlineMs: now + 80_000, pausedRemainingMs: null, lastSeenAt: now,
    recorder: { timezone: 'Europe/Warsaw', sessionId: 'session', startedAt: new Date(now - 40_000).toISOString(), stepResults: [], attempts: [],
      exerciseRatings: [], focusRatings: [], completedAt: null, endedEarly: false },
  }
}

beforeEach(() => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('active workout local storage', () => {
  it.each(['running', 'paused'] as const)('round-trips corrected targets and corrected completed results while %s', (status) => {
    const saved = snapshot()
    const steps = createWorkoutPlaybackTimeline(saved.plan).steps
    saved.stepDurations = { [steps[0].id]: 135, [steps[2].id]: 105 }
    saved.playback = { ...saved.playback, status, currentStepIndex: 2 }
    saved.deadlineMs = status === 'running' ? now + 80_000 : null
    saved.pausedRemainingMs = status === 'paused' ? 79_625 : null
    saved.recorder.stepResults = [{ stepIndex: 0, playbackStepId: steps[0].id, plannedDurationSeconds: 135, performedDurationSeconds: 135, outcome: 'completed' }]
    const repository = createActiveWorkoutRepository('owner')
    repository.save(saved)
    expect(repository.read()).toEqual(saved)
    // Restarting restores the live target but must preserve the best previous result.
    saved.stepDurations[steps[0].id] = 120
    repository.save(saved)
    expect(repository.read()).toEqual(saved)
  })

  it.each([0, -15, 1.5])('rejects invalid corrected targets: %s', (target) => {
    const saved = snapshot()
    saved.stepDurations = { [createWorkoutPlaybackTimeline(saved.plan).steps[0].id]: target }
    localStorage.setItem(ACTIVE_WORKOUT_STORAGE_PREFIX + 'owner', JSON.stringify(saved))
    expect(createActiveWorkoutRepository('owner').read()).toBeNull()
  })

  it('rejects unknown corrected stage IDs and completed results unequal to the corrected target', () => {
    const saved = snapshot()
    saved.stepDurations = { unknown: 135 }
    const key = ACTIVE_WORKOUT_STORAGE_PREFIX + 'owner'
    localStorage.setItem(key, JSON.stringify(saved))
    expect(createActiveWorkoutRepository('owner').read()).toBeNull()
    const id = createWorkoutPlaybackTimeline(saved.plan).steps[0].id
    saved.stepDurations = { [id]: 135 }
    saved.recorder.stepResults = [{ stepIndex: 0, playbackStepId: id, plannedDurationSeconds: 135, performedDurationSeconds: 120, outcome: 'completed' }]
    localStorage.setItem(key, JSON.stringify(saved))
    expect(createActiveWorkoutRepository('owner').read()).toBeNull()
  })
  it('round-trips a plan snapshot independently for each account', () => {
    const owner = createActiveWorkoutRepository('owner')
    owner.save(snapshot())
    expect(createActiveWorkoutRepository('owner').read()).toEqual(snapshot())
    expect(createActiveWorkoutRepository('other').read()).toBeNull()
    createActiveWorkoutRepository('other').clear()
    expect(owner.read()).toEqual(snapshot())
  })

  it.each(['{', 'null', '{}', JSON.stringify({ ...snapshot(), schemaVersion: 2 }),
    JSON.stringify({ ...snapshot(), playback: { ...snapshot().playback, currentStepIndex: 999 } }),
    JSON.stringify({ ...snapshot(), deadlineMs: null }),
  ])('silently removes an invalid snapshot: %s', (raw) => {
    localStorage.setItem(ACTIVE_WORKOUT_STORAGE_PREFIX + 'owner', raw)
    expect(createActiveWorkoutRepository('owner').read()).toBeNull()
    expect(localStorage.getItem(ACTIVE_WORKOUT_STORAGE_PREFIX + 'owner')).toBeNull()
  })

  it('tolerates blocked storage and quota failures without interrupting playback', () => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage denied') } })
    const repository = createActiveWorkoutRepository('owner')
    expect(repository.read()).toBeNull()
    expect(() => repository.save(snapshot())).not.toThrow()
    expect(() => repository.clear()).not.toThrow()
  })

  it('persists preparation, exact pause milliseconds, skips and ratings', () => {
    const saved = snapshot()
    saved.playback.status = 'preparing'
    saved.playback.remainingSeconds = 10
    saved.deadlineMs = now + 10_000
    saved.recorder.sessionId = null
    saved.recorder.startedAt = null
    const repository = createActiveWorkoutRepository('owner')
    repository.save(saved)
    expect(repository.read()).toEqual(saved)

    saved.playback.status = 'paused'
    saved.playback.remainingSeconds = 80
    saved.deadlineMs = null
    saved.pausedRemainingMs = 79_625
    saved.recorder.sessionId = 'session'
    saved.recorder.startedAt = new Date(now - 40_375).toISOString()
    saved.recorder.exerciseRatings = [{ workoutItemId: 'jab', nameSnapshot: 'Jab', blockType: 'bag', rating: 4 }]
    repository.save(saved)
    expect(repository.read()).toEqual(saved)
    repository.clear()
    expect(repository.read()).toBeNull()
  })
})

it('round-trips quickTimer source and still reads version 1 snapshots without a source', () => {
  const repository = createActiveWorkoutRepository('owner')
  const saved = snapshot()
  repository.save(saved)
  expect(repository.read()).toEqual(saved)
  expect(repository.read()?.source).toBeUndefined()
  repository.save({ ...saved, source: 'quickTimer' })
  expect(repository.read()?.source).toBe('quickTimer')
})

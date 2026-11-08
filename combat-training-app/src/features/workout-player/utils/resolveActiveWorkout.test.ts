import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveWorkout } from '@/application/workout/activeWorkoutRepository'
import { block, roundsExercise, workoutPlan } from '@/test/workoutBuilders'
import { resolveActiveWorkout } from './resolveActiveWorkout'
import { createWorkoutPlaybackTimeline } from './createWorkoutPlaybackTimeline'

const now = Date.parse('2026-11-08T10:00:00.000Z')

function savedWorkout(): ActiveWorkout {
  return {
    schemaVersion: 1,
    plan: workoutPlan([block('bag', [roundsExercise('jab', 3, 120, 30)], 'bag')]),
    playback: { status: 'running', currentStepIndex: 2, remainingSeconds: 80, stepRevision: 3 },
    deadlineMs: now + 80_000,
    pausedRemainingMs: null,
    recorder: {
      timezone: 'Europe/Warsaw',
      sessionId: 'session', startedAt: new Date(now - 190_000).toISOString(),
      stepResults: [], attempts: [], exerciseRatings: [], focusRatings: [], completedAt: null, endedEarly: false,
    },
    lastSeenAt: now,
  }
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now) })
afterEach(() => vi.useRealTimers())

describe('active workout recovery', () => {
  function withPriorWork() {
    const saved = savedWorkout()
    const steps = createWorkoutPlaybackTimeline(saved.plan).steps
    saved.recorder.stepResults = [0, 1].map((index) => ({
      stepIndex: index, playbackStepId: steps[index].id, plannedDurationSeconds: index === 0 ? 120 : 30,
      performedDurationSeconds: index === 0 ? 120 : 30, outcome: 'completed',
    }))
    saved.recorder.attempts = [
      { kind: 'exercise', blockType: 'bag', performedDurationMs: 120_000, outcome: 'completed' },
      { kind: 'roundRest', blockType: 'bag', performedDurationMs: 30_000, outcome: 'completed' },
    ]
    return saved
  }

  it('resumes round two with forty seconds left after forty seconds away', () => {
    const saved = savedWorkout()
    vi.setSystemTime(now + 40_000)
    expect(resolveActiveWorkout(saved, Date.now())).toMatchObject({
      kind: 'resume', workout: { playback: { status: 'running', currentStepIndex: 2, remainingSeconds: 40 }, deadlineMs: now + 80_000 },
    })
    expect(saved.playback.remainingSeconds).toBe(80)
  })

  it('catches up through round two and its rest, recording both elapsed stages', () => {
    vi.setSystemTime(now + 120_000)
    expect(resolveActiveWorkout(savedWorkout(), Date.now())).toMatchObject({
      kind: 'resume', workout: {
        playback: { status: 'running', currentStepIndex: 4, remainingSeconds: 110 },
        deadlineMs: now + 230_000,
        recorder: { attempts: [
          { kind: 'exercise', outcome: 'completed', performedDurationMs: 120_000 },
          { kind: 'roundRest', outcome: 'completed', performedDurationMs: 30_000 },
        ] },
      },
    })
  })

  it('keeps the exact paused milliseconds and preserves skips and ratings', () => {
    const saved = savedWorkout()
    saved.playback.status = 'paused'
    saved.deadlineMs = null
    saved.pausedRemainingMs = 79_625
    saved.recorder.exerciseRatings = [{ workoutItemId: 'jab', nameSnapshot: 'Jab', blockType: 'bag', rating: 4 }]
    saved.recorder.stepResults = [{ stepIndex: 0, playbackStepId: 'skipped', plannedDurationSeconds: 120, performedDurationSeconds: 0, outcome: 'skipped' }]
    vi.setSystemTime(now + 600_000)
    expect(resolveActiveWorkout(saved, Date.now())).toEqual({ kind: 'resume', workout: saved })
  })

  it('resumes preparation before the first exercise has started', () => {
    const saved = savedWorkout()
    saved.playback = { status: 'preparing', currentStepIndex: 0, remainingSeconds: 10, stepRevision: 1 }
    saved.deadlineMs = now + 10_000
    saved.recorder.sessionId = null
    saved.recorder.startedAt = null
    vi.setSystemTime(now + 4_000)
    expect(resolveActiveWorkout(saved, Date.now())).toMatchObject({
      kind: 'resume', workout: { playback: { status: 'preparing', remainingSeconds: 6 }, recorder: { startedAt: null } },
    })
  })

  it('starts at the preparation deadline and records stages elapsed while away', () => {
    const saved = savedWorkout()
    saved.playback = { status: 'preparing', currentStepIndex: 0, remainingSeconds: 10, stepRevision: 1 }
    saved.deadlineMs = now + 10_000
    saved.recorder.sessionId = null
    saved.recorder.startedAt = null
    vi.setSystemTime(now + 150_000)
    expect(resolveActiveWorkout(saved, Date.now())).toMatchObject({
      kind: 'resume', workout: {
        playback: { status: 'running', currentStepIndex: 1, remainingSeconds: 10 },
        recorder: { startedAt: '2026-11-08T10:00:10.000Z', attempts: [{ kind: 'exercise', performedDurationMs: 120_000 }] },
      },
    })
  })

  it('offers only the work up to lastSeenAt when the plan would have ended while away', () => {
    vi.setSystemTime(now + 500_000)
    expect(resolveActiveWorkout(withPriorWork(), Date.now())).toMatchObject({
      kind: 'interrupted', session: {
        id: 'session', status: 'partial', completedAt: '2026-11-08T10:00:00.000Z',
        durationSeconds: 190, workSeconds: 120,
        stepResults: [{ outcome: 'completed' }, { outcome: 'completed' }, { outcome: 'skipped' }, { outcome: 'skipped' }, { outcome: 'skipped' }],
      },
    })
  })

  it('treats a pause older than twelve hours as interrupted without counting the pause', () => {
    const saved = withPriorWork()
    saved.playback.status = 'paused'
    saved.deadlineMs = null
    saved.pausedRemainingMs = 79_625
    vi.setSystemTime(now + 12 * 60 * 60 * 1000 + 1)
    expect(resolveActiveWorkout(saved, Date.now())).toMatchObject({
      kind: 'interrupted', session: { status: 'partial', durationSeconds: 190.375, workSeconds: 120 },
    })
  })

  it('returns none for no saved workout', () => {
    expect(resolveActiveWorkout(null, Date.now())).toEqual({ kind: 'none' })
  })

  it('drops an interrupted workout without completed work', () => {
    const saved = savedWorkout()
    saved.playback.currentStepIndex = 0
    vi.setSystemTime(now + 600_000)
    expect(resolveActiveWorkout(saved, Date.now())).toEqual({ kind: 'none' })
  })

  it('keeps an already finalized session for retrying its local Firestore save', () => {
    const saved = withPriorWork()
    saved.playback.status = 'completed'
    saved.deadlineMs = null
    saved.recorder.completedAt = now
    saved.recorder.endedEarly = true
    expect(resolveActiveWorkout(saved, Date.now())).toEqual({ kind: 'resume', workout: saved })
  })

  it('uses the recorded timezone when deriving the workout day after recovery', () => {
    const saved = withPriorWork()
    saved.recorder.timezone = 'Pacific/Honolulu'
    vi.setSystemTime(now + 600_000)
    expect(resolveActiveWorkout(saved, Date.now())).toMatchObject({
      kind: 'interrupted', session: { timezone: 'Pacific/Honolulu', workoutDate: '2026-11-07' },
    })
  })

  it('keeps skips, repeated attempts and both kinds of ratings in the recovered partial entry', () => {
    const saved = withPriorWork()
    const steps = createWorkoutPlaybackTimeline(saved.plan).steps
    saved.recorder.stepResults.push({ stepIndex: 4, playbackStepId: steps[4].id,
      plannedDurationSeconds: 120, performedDurationSeconds: 0, outcome: 'skipped' })
    saved.recorder.attempts.push({ kind: 'exercise', blockType: 'bag', performedDurationMs: 120_000, outcome: 'completed' })
    saved.recorder.exerciseRatings = [{ workoutItemId: 'jab', nameSnapshot: 'Jab', blockType: 'bag', rating: 4 }]
    saved.recorder.focusRatings = [{ workoutItemId: 'jab', focusSkillId: 'guard', skillNameSnapshot: 'Guard',
      criterionSnapshot: 'Hands return', blockType: 'bag', assessment: 'unableToRate', correction: null, previousCorrectionCheck: null }]
    vi.setSystemTime(now + 600_000)
    expect(resolveActiveWorkout(saved, Date.now())).toMatchObject({ kind: 'interrupted', session: {
      workSeconds: 240, durationSeconds: 310, exerciseRatings: saved.recorder.exerciseRatings,
      focusRatings: saved.recorder.focusRatings, stepResults: [
        { outcome: 'completed' }, { outcome: 'completed' }, { outcome: 'skipped' }, { outcome: 'skipped' }, { outcome: 'skipped' },
      ],
    } })
  })

  it('reconciles a delayed last-seen snapshot only as far as that last-seen time', () => {
    const saved = savedWorkout()
    saved.playback = { status: 'running', currentStepIndex: 0, remainingSeconds: 120, stepRevision: 1 }
    saved.deadlineMs = now + 120_000
    saved.lastSeenAt = now + 190_000
    saved.recorder.startedAt = new Date(now).toISOString()
    vi.setSystemTime(now + 600_000)
    expect(resolveActiveWorkout(saved, Date.now())).toMatchObject({ kind: 'interrupted', session: {
      durationSeconds: 190, workSeconds: 120, completedAt: '2026-11-08T10:03:10.000Z',
    } })
  })
})

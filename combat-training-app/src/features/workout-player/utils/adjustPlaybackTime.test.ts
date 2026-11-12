import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkoutPlaybackState } from '@/domain/workout-playback/workoutPlayback.types'
import { playbackStep } from '@/test/workoutBuilders'
import { adjustPlaybackTime, applyStepDurations } from './adjustPlaybackTime'
import { resolveRunningPlaybackAtTime } from './resolveRunningPlaybackAtTime'
import { finalizePlaybackSteps } from './finishPlaybackSteps'
import { selectWorkoutGongSignal } from './selectWorkoutGongSignal'

const now = Date.parse('2026-11-12T10:00:00.000Z')
const playback: WorkoutPlaybackState = { status: 'running', currentStepIndex: 0, remainingSeconds: 150, stepRevision: 1 }

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now) })
afterEach(() => vi.useRealTimers())

describe('fifteen-second adjustment', () => {
  it.each([-15, 15] as const)('shifts the running deadline by %s seconds without rounding milliseconds', (delta) => {
    vi.setSystemTime(now + 375)
    const adjusted = adjustPlaybackTime(playback, playbackStep('round', 180), now + 150_000, null, delta, Date.now())
    expect(adjusted.deadlineMs).toBe(now + (150 + delta) * 1000)
    expect(adjusted.step.durationSeconds).toBe(180 + delta)
    expect(adjusted.playback.remainingSeconds).toBe(150 + delta)
    expect(adjusted.pausedRemainingMs).toBeNull()
  })

  it.each([-15, 15] as const)('adjusts an exact paused duration by %s without counting pause time', (delta) => {
    vi.setSystemTime(now + 600_000)
    const adjusted = adjustPlaybackTime({ ...playback, status: 'paused' }, playbackStep('round', 180), null, 149_625, delta, Date.now())
    expect(adjusted.pausedRemainingMs).toBe(149_625 + delta * 1000)
    expect(adjusted.playback).toMatchObject({ status: 'paused', remainingSeconds: 150 + delta })
    expect(adjusted.deadlineMs).toBeNull()
  })

  it.each(['running', 'paused'] as const)('finishes a %s stage at ten seconds without consuming the next stage', (status) => {
    const adjusted = adjustPlaybackTime({ ...playback, status, remainingSeconds: 10 }, playbackStep('round', 180),
      status === 'running' ? now + 10_000 : null, status === 'paused' ? 10_000 : null, -15, Date.now())
    expect(adjusted.playback.remainingSeconds).toBe(0)
    // 2:50 was already worked, so the shortened round records 170 s, not 180 - 15.
    expect(adjusted.step.durationSeconds).toBe(170)
    const steps = [adjusted.step, { ...playbackStep('rest', 30), kind: 'roundRest' as const }]
    expect(resolveRunningPlaybackAtTime({ ...adjusted.playback, status: 'running' }, now, Date.now(), steps))
      .toMatchObject({ playback: { currentStepIndex: 1, remainingSeconds: 30 }, deadlineMs: now + 30_000 })
    expect(finalizePlaybackSteps(steps, 0, 1, 0, 170_000, 'elapsed')[0])
      .toMatchObject({ reason: 'elapsed', plannedDurationSeconds: 170, performedDurationSeconds: 170, outcome: 'completed' })
    expect(selectWorkoutGongSignal(finalizePlaybackSteps(steps, 0, 1, 0, 170_000, 'elapsed'), steps)).toBe('workEnd')
  })

  it.each(['running', 'paused'] as const)('records the worked time shown on the clock when a %s stage is cut at 9.4 s', (status) => {
    const adjusted = adjustPlaybackTime({ ...playback, status, remainingSeconds: 10 }, playbackStep('round', 180),
      status === 'running' ? now + 9_400 : null, status === 'paused' ? 9_400 : null, -15, Date.now())
    expect(adjusted.playback.remainingSeconds).toBe(0)
    expect(adjusted.step.durationSeconds).toBe(170)
  })

  it('accumulates corrections and clamps the target to one second', () => {
    let adjusted = adjustPlaybackTime(playback, playbackStep('round', 180), now + 150_000, null, 15, Date.now())
    adjusted = adjustPlaybackTime(adjusted.playback, adjusted.step, adjusted.deadlineMs, null, 15, Date.now())
    adjusted = adjustPlaybackTime(adjusted.playback, adjusted.step, adjusted.deadlineMs, null, -15, Date.now())
    expect(adjusted.step.durationSeconds).toBe(195)
    expect(adjusted.deadlineMs).toBe(now + 165_000)
    const minimum = adjustPlaybackTime({ ...playback, remainingSeconds: 10 }, playbackStep('short', 10), now + 10_000, null, -15, Date.now())
    expect(minimum.step.durationSeconds).toBe(1)
    expect(minimum.playback.remainingSeconds).toBe(0)
  })

  it('applies saved targets without changing the plan or unrelated stages', () => {
    const steps = [playbackStep('round', 180), playbackStep('rest', 30)]
    expect(applyStepDurations(steps, { round: 195 }).map((step) => step.durationSeconds)).toEqual([195, 30])
    expect(steps[0].durationSeconds).toBe(180)
    expect(applyStepDurations(steps).map((step) => step.durationSeconds)).toEqual([180, 30])
  })

  it('completes the last stage through the elapsed path and selects the end gong', () => {
    const adjusted = adjustPlaybackTime({ ...playback, remainingSeconds: 10 }, playbackStep('last', 20), now + 10_000, null, -15, Date.now())
    const steps = [adjusted.step]
    expect(resolveRunningPlaybackAtTime(adjusted.playback, adjusted.deadlineMs!, Date.now(), steps).playback.status).toBe('completed')
    expect(selectWorkoutGongSignal([...finalizePlaybackSteps(steps, 0, 1, 0, 5000, 'elapsed'), { type: 'completed', timestampMs: now }], steps)).toBe('workoutEnd')
  })
})

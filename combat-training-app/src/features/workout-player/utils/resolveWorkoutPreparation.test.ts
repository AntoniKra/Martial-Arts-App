import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { calculateWorkoutSessionDurations } from '@/domain/workout-session/workoutSessionDefinitions'
import type { WorkoutPlaybackState } from '@/domain/workout-playback/workoutPlayback.types'
import { resolveWorkoutPreparation } from '@/features/workout-player/utils/resolveWorkoutPreparation'
import { playbackStep } from '@/test/workoutBuilders'

const START_MS = new Date('2026-11-08T10:00:00Z').getTime()
const deadline = START_MS + 10_000
const preparing: WorkoutPlaybackState = {
  status: 'preparing', currentStepIndex: 0, remainingSeconds: 10, stepRevision: 1,
}
const steps = [playbackStep('round-1', 60), { ...playbackStep('rest', 30), kind: 'roundRest' as const }, playbackStep('round-2', 60)]

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(START_MS)
})
afterEach(() => vi.useRealTimers())

describe('workout preparation', () => {
  it('counts down from the deadline, rounding remaining seconds up', () => {
    vi.setSystemTime(START_MS + 4_100)
    const result = resolveWorkoutPreparation(preparing, deadline, Date.now(), steps)
    expect(result.playback).toMatchObject({ status: 'preparing', remainingSeconds: 6 })
    expect(result.startedAtMs).toBeNull()
    expect(result.deadlineMs).toBe(deadline)
  })

  it('starts the first step exactly at the preparation deadline', () => {
    vi.setSystemTime(deadline)
    const result = resolveWorkoutPreparation(preparing, deadline, Date.now(), steps)
    expect(result.playback).toMatchObject({ status: 'running', currentStepIndex: 0, remainingSeconds: 60 })
    expect(result.startedAtMs).toBe(deadline)
    expect(result.deadlineMs).toBe(deadline + 60_000)
  })

  it('catches up after twenty seconds hidden with ten seconds of preparation', () => {
    vi.setSystemTime(START_MS + 20_000)
    const result = resolveWorkoutPreparation(preparing, deadline, Date.now(), steps)
    expect(result.playback).toMatchObject({ status: 'running', currentStepIndex: 0, remainingSeconds: 50 })
    expect(result.startedAtMs).toBe(deadline)
    expect(result.deadlineMs).toBe(deadline + 60_000)
  })

  it('catches up across multiple workout steps without adding a preparation step', () => {
    vi.setSystemTime(START_MS + 105_000)
    const result = resolveWorkoutPreparation(preparing, deadline, Date.now(), steps)
    expect(result.playback).toMatchObject({ status: 'running', currentStepIndex: 2, remainingSeconds: 55 })
    expect(result.startedAtMs).toBe(deadline)
    expect(result.deadlineMs).toBe(deadline + 150_000)
  })

  it('starts immediately with a fresh full first step when preparation is skipped', () => {
    vi.setSystemTime(START_MS + 2_500)
    const result = resolveWorkoutPreparation(preparing, deadline, Date.now(), steps, true)
    expect(result.playback).toMatchObject({ status: 'running', currentStepIndex: 0, remainingSeconds: 60 })
    expect(result.startedAtMs).toBe(Date.now())
    expect(result.deadlineMs).toBe(Date.now() + 60_000)
  })

  it('does not reset the first step when Start now is clicked after the deadline', () => {
    vi.setSystemTime(deadline + 10_000)
    const result = resolveWorkoutPreparation(preparing, deadline, Date.now(), steps, true)
    expect(result.playback.remainingSeconds).toBe(50)
    expect(result.startedAtMs).toBe(deadline)
  })

  it('completes after a long suspension and excludes preparation from session timing and work', () => {
    vi.setSystemTime(START_MS + 300_000)
    const result = resolveWorkoutPreparation(preparing, deadline, Date.now(), steps)
    expect(result.playback).toMatchObject({ status: 'completed', currentStepIndex: 2 })
    expect(result.deadlineMs).toBeNull()
    expect(new Date(result.startedAtMs!).toISOString()).toBe('2026-11-08T10:00:10.000Z')
    const durations = calculateWorkoutSessionDurations(steps.map((step) => ({
      kind: step.kind, blockType: step.blockType, performedDurationMs: step.durationSeconds * 1000, outcome: 'completed',
    })))
    expect(durations).toEqual({ durationSeconds: 150, workSeconds: 120, sparringSeconds: 0 })
  })

  it.each(['idle', 'running', 'paused', 'completed'] as const)('never prepares again during %s playback', (status) => {
    const current = { ...preparing, status }
    vi.setSystemTime(deadline + 100_000)
    expect(resolveWorkoutPreparation(current, deadline, Date.now(), steps, true))
      .toEqual({ playback: current, deadlineMs: deadline, startedAtMs: null })
  })

  it('does not start a session for an empty timeline', () => {
    vi.setSystemTime(deadline)
    expect(resolveWorkoutPreparation(preparing, deadline, Date.now(), []).startedAtMs).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'

import type { WorkoutPlaybackState } from '@/domain/workout-playback/workoutPlayback.types'
import { resolveRunningPlaybackAtTime } from '@/features/workout-player/utils/resolveRunningPlaybackAtTime'
import { playbackStep } from '@/test/workoutBuilders'

const START_MS = 1_000_000
const steps = [playbackStep('round-1', 60), playbackStep('rest-1', 30), playbackStep('round-2', 60)]

function running(currentStepIndex = 0): WorkoutPlaybackState {
  return { status: 'running', currentStepIndex, remainingSeconds: 60, stepRevision: 1 }
}

describe('resolveRunningPlaybackAtTime', () => {
  it('keeps the current step and rounds remaining time up before the deadline', () => {
    const deadline = START_MS + 60_000

    const result = resolveRunningPlaybackAtTime(running(), deadline, START_MS + 10_500, steps)

    expect(result.playback).toMatchObject({ status: 'running', currentStepIndex: 0, remainingSeconds: 50 })
    expect(result.deadlineMs).toBe(deadline)
  })

  it('moves to the next step exactly at the deadline', () => {
    const deadline = START_MS + 60_000

    const result = resolveRunningPlaybackAtTime(running(), deadline, deadline, steps)

    expect(result.playback).toMatchObject({ currentStepIndex: 1, remainingSeconds: 30 })
    expect(result.deadlineMs).toBe(deadline + 30_000)
  })

  it('catches up over several steps after the tab was in the background', () => {
    const deadline = START_MS + 60_000
    const now = START_MS + 60_000 + 30_000 + 15_000

    const result = resolveRunningPlaybackAtTime(running(), deadline, now, steps)

    expect(result.playback).toMatchObject({ status: 'running', currentStepIndex: 2, remainingSeconds: 45 })
    expect(result.deadlineMs).toBe(START_MS + 150_000)
  })

  it('completes the workout once the last step has elapsed', () => {
    const deadline = START_MS + 60_000

    const result = resolveRunningPlaybackAtTime(running(), deadline, START_MS + 10 * 60_000, steps)

    expect(result.playback).toMatchObject({ status: 'completed', currentStepIndex: 2, remainingSeconds: 0 })
    expect(result.deadlineMs).toBeNull()
  })

  it('skips a zero-length break without stopping on it', () => {
    const withEmptyBreak = [playbackStep('round-1', 60), playbackStep('break', 0), playbackStep('round-2', 60)]
    const deadline = START_MS + 60_000

    const result = resolveRunningPlaybackAtTime(running(), deadline, deadline, withEmptyBreak)

    expect(result.playback).toMatchObject({ currentStepIndex: 2, remainingSeconds: 60 })
  })

  it('leaves a paused playback untouched', () => {
    const paused: WorkoutPlaybackState = { status: 'paused', currentStepIndex: 0, remainingSeconds: 42, stepRevision: 1 }

    const result = resolveRunningPlaybackAtTime(paused, START_MS, START_MS + 999_999, steps)

    expect(result.playback).toBe(paused)
  })

  it('completes immediately when there are no steps', () => {
    const result = resolveRunningPlaybackAtTime(running(), START_MS, START_MS, [])

    expect(result.playback.status).toBe('completed')
    expect(result.deadlineMs).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'

import type { WorkoutPlaybackState } from '@/domain/workout-playback/workoutPlayback.types'
import { getResumeDeadlineMs, pauseRunningStep } from '@/features/workout-player/utils/playbackPause'
import { getElapsedInStepMs } from '@/features/workout-player/utils/previousStepAction'
import { calculateWorkoutSessionDurations } from '@/domain/workout-session/workoutSessionDefinitions'

const START_MS = 1_000_000

function running(remainingSeconds = 60): WorkoutPlaybackState {
  return { status: 'running', currentStepIndex: 0, remainingSeconds, stepRevision: 1 }
}

describe('pauseRunningStep', () => {
  it('keeps the exact remaining milliseconds and rounds only the displayed seconds', () => {
    const paused = pauseRunningStep(running(), START_MS + 60_000, START_MS + 100)

    expect(paused.remainingMs).toBe(59_900)
    expect(paused.playback).toMatchObject({ status: 'paused', currentStepIndex: 0, remainingSeconds: 60 })
  })

  it('never displays less than one second while the step has not elapsed', () => {
    const paused = pauseRunningStep(running(1), START_MS + 1, START_MS)

    expect(paused.remainingMs).toBe(1)
    expect(paused.playback.remainingSeconds).toBe(1)
  })
})

describe('getResumeDeadlineMs', () => {
  it('resumes from the stored milliseconds of the same paused state', () => {
    const paused = pauseRunningStep(running(), START_MS + 60_000, START_MS + 100)

    expect(getResumeDeadlineMs(paused.playback, paused, START_MS + 5_000)).toBe(START_MS + 5_000 + 59_900)
  })

  it('falls back to whole seconds when the stored pause belongs to another state', () => {
    const paused = pauseRunningStep(running(), START_MS + 60_000, START_MS + 100)
    const movedWhilePaused: WorkoutPlaybackState = { ...paused.playback, currentStepIndex: 1, remainingSeconds: 30 }

    expect(getResumeDeadlineMs(movedWhilePaused, paused, START_MS + 5_000)).toBe(START_MS + 5_000 + 30_000)
  })

  it('falls back to whole seconds when nothing was stored', () => {
    const paused: WorkoutPlaybackState = { status: 'paused', currentStepIndex: 0, remainingSeconds: 42, stepRevision: 1 }

    expect(getResumeDeadlineMs(paused, null, START_MS)).toBe(START_MS + 42_000)
  })

  it('does not add time over many short pause and resume cycles', () => {
    let nowMs = START_MS
    let deadlineMs = nowMs + 60_000
    let playback = running()

    for (let cycle = 0; cycle < 20; cycle += 1) {
      nowMs += 100
      const paused = pauseRunningStep(playback, deadlineMs, nowMs)

      nowMs += 3_000
      deadlineMs = getResumeDeadlineMs(paused.playback, paused, nowMs)
      playback = { ...paused.playback, status: 'running' }
    }

    expect(deadlineMs - nowMs).toBe(58_000)
  })

  it('counts a repeated attempt and resumed work but excludes a controlled 90-second pause', () => {
    let nowMs = START_MS
    const firstDeadline = nowMs + 60_000
    nowMs += 10_000
    const firstAttemptMs = getElapsedInStepMs(running(), 60, firstDeadline, null, nowMs)

    // Restart the round, do five seconds of work, then pause for ninety seconds.
    const repeatedDeadline = nowMs + 60_000
    nowMs += 5_000
    const paused = pauseRunningStep(running(), repeatedDeadline, nowMs)
    nowMs += 90_000
    const resumedDeadline = getResumeDeadlineMs(paused.playback, paused, nowMs)
    const resumed = { ...paused.playback, status: 'running' as const }
    nowMs += 55_000
    const repeatedAttemptMs = getElapsedInStepMs(resumed, 60, resumedDeadline, null, nowMs)

    expect(nowMs - START_MS).toBe(160_000)
    expect(calculateWorkoutSessionDurations([
      { kind: 'exercise', blockType: 'sparring', performedDurationMs: firstAttemptMs, outcome: 'skipped' },
      { kind: 'exercise', blockType: 'sparring', performedDurationMs: repeatedAttemptMs, outcome: 'completed' },
    ])).toEqual({ durationSeconds: 70, workSeconds: 60, sparringSeconds: 60 })
  })
})

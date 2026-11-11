import { describe, expect, it } from 'vitest'
import type { WorkoutPlaybackState } from '@/domain/workout-playback/workoutPlayback.types'
import { choosePreviousStepAction, getElapsedInStepMs, PREVIOUS_RESTART_THRESHOLD_MS } from './previousStepAction'

describe('choosePreviousStepAction', () => {
  it('restarts the current step after more than three seconds', () => {
    expect(choosePreviousStepAction(2, PREVIOUS_RESTART_THRESHOLD_MS + 1)).toBe('restartCurrent')
  })

  it('goes back to the previous step within the first three seconds', () => {
    expect(choosePreviousStepAction(2, 0)).toBe('goToPrevious')
    expect(choosePreviousStepAction(2, PREVIOUS_RESTART_THRESHOLD_MS)).toBe('goToPrevious')
  })

  it('always restarts on the first step', () => {
    expect(choosePreviousStepAction(0, 0)).toBe('restartCurrent')
    expect(choosePreviousStepAction(0, 60_000)).toBe('restartCurrent')
  })
})

describe('getElapsedInStepMs', () => {
  const running: WorkoutPlaybackState = { status: 'running', currentStepIndex: 1, remainingSeconds: 57, stepRevision: 3 }
  const paused: WorkoutPlaybackState = { ...running, status: 'paused' }

  it('uses the deadline of a running step', () => {
    expect(getElapsedInStepMs(running, 60, 1_056_500, null, 1_000_000)).toBe(3_500)
  })

  it('uses the exact milliseconds stored for the same paused state', () => {
    expect(getElapsedInStepMs(paused, 60, null, { playback: paused, remainingMs: 56_900 }, 5_000_000)).toBe(3_100)
  })

  it('falls back to whole seconds when the stored pause belongs to another state', () => {
    expect(getElapsedInStepMs(paused, 60, null, { playback: { ...paused }, remainingMs: 10_000 }, 0)).toBe(3_000)
  })

  it('never reports negative time', () => {
    expect(getElapsedInStepMs(running, 60, 2_000_000, null, 1_000_000)).toBe(0)
  })
})

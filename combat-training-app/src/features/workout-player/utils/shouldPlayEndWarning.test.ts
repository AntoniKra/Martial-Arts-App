import { afterEach, describe, expect, it, vi } from 'vitest'

import { createWorkoutPlaybackTimeline } from '@/domain/workout-playback/createWorkoutPlaybackTimeline'
import { adjustPlaybackTime } from './adjustPlaybackTime'
import { shouldPlayEndWarning } from './shouldPlayEndWarning'
import { block, continuousExercise, playbackStep, roundsExercise, workoutBreak, workoutPlan } from '@/test/workoutBuilders'

const defaults = { previousRemainingMs: 10_001, remainingMs: 10_000, stepDurationMs: 40_000,
  running: true, enabled: true }

afterEach(() => vi.useRealTimers())

describe('workout end warning', () => {
  it.each([10_000, 9999, 7000])('plays on crossing to %i ms remaining', (remainingMs) => {
    expect(shouldPlayEndWarning({ ...defaults, remainingMs })).toBe(true)
  })

  it.each([10_001, 6999, 0])('stays silent at %i ms remaining', (remainingMs) => {
    expect(shouldPlayEndWarning({ ...defaults, remainingMs })).toBe(false)
  })

  it.each([20_000, 30_000, 31_000])('requires a target longer than 30 seconds: %i ms', (stepDurationMs) => {
    expect(shouldPlayEndWarning({ ...defaults, stepDurationMs })).toBe(stepDurationMs > 30_000)
  })

  it('stays silent while paused, preparing or disabled', () => {
    expect(shouldPlayEndWarning({ ...defaults, running: false })).toBe(false)
    expect(shouldPlayEndWarning({ ...defaults, enabled: false })).toBe(false)
  })

  it.each([null, 10_000, 9999, 7000])('does not repeat or replay a warning after resume/reload from %s ms', (previousRemainingMs) => {
    expect(shouldPlayEndWarning({ ...defaults, previousRemainingMs, remainingMs: 9000 })).toBe(false)
  })

  it('plays only once over many deadline-based ticks, even when a tick is skipped', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const deadlineMs = 40_000
    let previousRemainingMs = 40_000
    const warnings: number[] = []
    for (const nowMs of [29_999, 30_001, 30_250, 31_000, 35_000, 40_000]) {
      vi.setSystemTime(nowMs)
      const remainingMs = deadlineMs - Date.now()
      if (shouldPlayEndWarning({ ...defaults, previousRemainingMs, remainingMs })) warnings.push(remainingMs)
      previousRemainingMs = remainingMs
    }
    expect(warnings).toEqual([9999])
  })

  it('rearms when adding fifteen seconds above the threshold', () => {
    vi.useFakeTimers()
    vi.setSystemTime(32_000)
    const step = playbackStep('round', 60)
    const playback = { status: 'running' as const, currentStepIndex: 0, remainingSeconds: 8, stepRevision: 1 }
    const adjusted = adjustPlaybackTime(playback, step, 40_000, null, 15, Date.now())
    const previousRemainingMs = adjusted.deadlineMs! - Date.now()
    expect(previousRemainingMs).toBe(23_000)
    expect(shouldPlayEndWarning({ ...defaults, previousRemainingMs: 8000, remainingMs: previousRemainingMs })).toBe(false)
    vi.setSystemTime(45_000)
    expect(shouldPlayEndWarning({ ...defaults, previousRemainingMs,
      remainingMs: adjusted.deadlineMs! - Date.now(), stepDurationMs: adjusted.step.durationSeconds * 1000 })).toBe(true)
  })

  it.each([24_000, 21_999])('subtracting fifteen seconds from %i ms obeys the lateness limit', (previousRemainingMs) => {
    vi.useFakeTimers()
    vi.setSystemTime(60_000 - previousRemainingMs)
    const step = playbackStep('round', 60)
    const playback = { status: 'running' as const, currentStepIndex: 0, remainingSeconds: Math.ceil(previousRemainingMs / 1000), stepRevision: 1 }
    const adjusted = adjustPlaybackTime(playback, step, 60_000, null, -15, Date.now())
    expect(shouldPlayEndWarning({ ...defaults, previousRemainingMs,
      remainingMs: adjusted.deadlineMs! - Date.now(), stepDurationMs: adjusted.step.durationSeconds * 1000 }))
      .toBe(previousRemainingMs === 24_000)
  })

  it('applies to rounds, round rests, standalone breaks and continuous work, including the last step', () => {
    const timeline = createWorkoutPlaybackTimeline(workoutPlan([block('b1', [
      roundsExercise('rounds', 2, 40, 40), workoutBreak('break', 40), continuousExercise('continuous', 40),
    ])]))
    expect(timeline.steps.map(({ kind }) => kind)).toEqual(['exercise', 'roundRest', 'exercise', 'break', 'exercise'])
    for (const step of timeline.steps) {
      expect(shouldPlayEndWarning({ ...defaults, stepDurationMs: step.durationSeconds * 1000 })).toBe(true)
    }
  })
})

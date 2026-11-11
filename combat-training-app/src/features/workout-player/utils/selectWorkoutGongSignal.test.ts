import { describe, expect, it, vi } from 'vitest'

import type { WorkoutGong } from '@/application/audio/workoutGong'
import type { WorkoutPlaybackStepKind } from '@/domain/workout-playback/workoutPlayback.types'
import type { WorkoutPlaybackEvent, WorkoutPlaybackStepFinalizeReason } from '@/features/workout-player/types/workoutPlaybackEvents.types'
import { createWorkoutGongController } from '@/features/workout-player/utils/createWorkoutGongController'
import { selectWorkoutGongSignal } from '@/features/workout-player/utils/selectWorkoutGongSignal'
import { playbackStep } from '@/test/workoutBuilders'

function step(kind: WorkoutPlaybackStepKind, index: number) {
  return { ...playbackStep(`step-${index}`, 10), kind }
}

function finalized(stepIndex: number, reason: WorkoutPlaybackStepFinalizeReason = 'elapsed'): WorkoutPlaybackEvent {
  return {
    type: 'stepFinalized', stepIndex, playbackStepId: `step-${stepIndex}`,
    performedDurationSeconds: 10, performedDurationMs: 10_000, outcome: 'completed', reason,
  }
}

const kinds: WorkoutPlaybackStepKind[] = ['exercise', 'roundRest', 'break']
const steps = [step('exercise', 0), step('roundRest', 1), step('exercise', 2), step('break', 3), step('exercise', 4)]

describe('selectWorkoutGongSignal', () => {
  for (const previousKind of kinds) {
    it.each(kinds)(`signals the new %s state after ${previousKind} elapses`, (nextKind) => {
      expect(selectWorkoutGongSignal([finalized(0)], [step(previousKind, 0), step(nextKind, 1)]))
        .toBe(nextKind === 'exercise' ? 'restEnd' : 'workEnd')
    })
  }

  it.each(['next', 'previous'] as const)('stays silent on manual %s navigation', (reason) => {
    expect(selectWorkoutGongSignal([finalized(0, reason)], steps)).toBeNull()
  })

  it('signals the first step after preparation with the round-start gong', () => {
    expect(selectWorkoutGongSignal([{ type: 'started', timestampMs: 10_000 }], steps)).toBe('restEnd')
  })

  it('stays silent without transitions and on restart', () => {
    expect(selectWorkoutGongSignal([], steps)).toBeNull()
    expect(selectWorkoutGongSignal([finalized(0), { type: 'restarted' }], steps)).toBeNull()
  })

  it('selects only the state reached after several elapsed steps', () => {
    expect(selectWorkoutGongSignal([finalized(0), finalized(1), finalized(2)], steps)).toBe('workEnd')
    expect(selectWorkoutGongSignal([finalized(0), finalized(1)], steps)).toBe('restEnd')
  })

  it('gives workout completion priority over elapsed transitions', () => {
    expect(selectWorkoutGongSignal([
      ...steps.map((_, index) => finalized(index)), { type: 'completed', timestampMs: 50_000 },
    ], steps)).toBe('workoutEnd')
  })

  it('uses the end signal when manually finishing the final step', () => {
    // Manual step changes are silent; the separate workout-completed event has its own cue.
    expect(selectWorkoutGongSignal([
      finalized(4, 'next'), { type: 'completed', timestampMs: 1000 },
    ], steps)).toBe('workoutEnd')
  })

  it('does not play a stale elapsed cue followed by manual navigation', () => {
    expect(selectWorkoutGongSignal([finalized(0), finalized(1, 'next')], steps)).toBeNull()
  })

  it('waits for completion rather than playing a transition past the last step', () => {
    expect(selectWorkoutGongSignal([finalized(4)], steps)).toBeNull()
  })
})

describe('workout gong event batching', () => {
  function setup() {
    const gong: WorkoutGong = { unlock: vi.fn(), play: vi.fn(), dispose: vi.fn() }
    return { gong, controller: createWorkoutGongController(steps, gong) }
  }

  it('plays at most one current-state cue when the timer catches up', async () => {
    const { controller, gong } = setup()
    controller.onPlaybackEvent(finalized(0))
    controller.onPlaybackEvent(finalized(1))
    controller.onPlaybackEvent(finalized(2))
    expect(gong.play).not.toHaveBeenCalled()
    await Promise.resolve()
    expect(gong.play).toHaveBeenCalledExactlyOnceWith('workEnd')
  })

  it('plays one start gong and follows only the reached state after hidden preparation', async () => {
    const { controller, gong } = setup()
    controller.onPlaybackEvent({ type: 'started', timestampMs: 10_000 })
    await Promise.resolve()
    expect(gong.play).toHaveBeenCalledExactlyOnceWith('restEnd')
    vi.mocked(gong.play).mockClear()
    controller.onPlaybackEvent({ type: 'started', timestampMs: 10_000 })
    controller.onPlaybackEvent(finalized(0))
    await Promise.resolve()
    expect(gong.play).toHaveBeenCalledExactlyOnceWith('workEnd')
  })

  it('plays only the completion cue after catching up through the entire workout', async () => {
    const { controller, gong } = setup()
    steps.forEach((_, index) => controller.onPlaybackEvent(finalized(index)))
    controller.onPlaybackEvent({ type: 'completed', timestampMs: 50_000 })
    await Promise.resolve()
    expect(gong.play).toHaveBeenCalledExactlyOnceWith('workoutEnd')
  })

  it('unlocks synchronously and leaves manual navigation silent', async () => {
    const { controller, gong } = setup()
    controller.unlock()
    expect(gong.unlock).toHaveBeenCalledOnce()
    controller.onPlaybackEvent(finalized(0, 'next'))
    controller.onPlaybackEvent(finalized(1, 'previous'))
    await Promise.resolve()
    expect(gong.play).not.toHaveBeenCalled()
  })

  it('cancels pending cues on restart without cancelling the next run', async () => {
    const { controller, gong } = setup()
    controller.onPlaybackEvent(finalized(0))
    controller.onPlaybackEvent({ type: 'restarted' })
    controller.onPlaybackEvent(finalized(1))
    await Promise.resolve()
    expect(gong.play).toHaveBeenCalledExactlyOnceWith('restEnd')
  })

  it('cancels pending cues and closes audio on leaving the player', async () => {
    const { controller, gong } = setup()
    controller.onPlaybackEvent(finalized(0))
    controller.dispose()
    await Promise.resolve()
    expect(gong.play).not.toHaveBeenCalled()
    expect(gong.dispose).toHaveBeenCalledOnce()
  })
})

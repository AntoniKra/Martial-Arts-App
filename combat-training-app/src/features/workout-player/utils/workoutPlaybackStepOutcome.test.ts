import { describe, expect, it } from 'vitest'

import { calculateWorkoutSessionDurations } from '@/domain/workout-session/workoutSessionDefinitions'
import { calculatePerformedDurationSeconds, deriveStepOutcome } from '@/features/workout-player/utils/workoutPlaybackStepOutcome'

describe('exercise step finalization (ADR 0005, 6 November 2026)', () => {
  for (const reason of ['next', 'previous'] as const) {
    it.each([0, 0.5, 120, 180])(`skips an exercise ended by ${reason} after %s seconds without awarding work`, (elapsedSeconds) => {
      const performedDurationSeconds = calculatePerformedDurationSeconds(180, 180 - Math.floor(elapsedSeconds), reason, 'exercise')
      const outcome = deriveStepOutcome(180, performedDurationSeconds, reason, 'exercise')
      expect(performedDurationSeconds).toBe(0)
      expect(outcome).toBe('skipped')
      expect(calculateWorkoutSessionDurations([{
        kind: 'exercise', blockType: 'sparring', outcome, performedDurationMs: elapsedSeconds * 1000,
      }])).toEqual({ durationSeconds: elapsedSeconds, workSeconds: 0, sparringSeconds: 0 })
    })
  }

  it('completes and awards the full round only when its time elapses', () => {
    const performedDurationSeconds = calculatePerformedDurationSeconds(180, 0, 'elapsed', 'exercise')
    const outcome = deriveStepOutcome(180, performedDurationSeconds, 'elapsed', 'exercise')
    expect(performedDurationSeconds).toBe(180)
    expect(outcome).toBe('completed')
    expect(calculateWorkoutSessionDurations([{
      kind: 'exercise', blockType: 'sparring', outcome, performedDurationMs: 180_000,
    }])).toEqual({ durationSeconds: 180, workSeconds: 180, sparringSeconds: 180 })
  })
})

describe('rest and break step finalization', () => {
  for (const kind of ['roundRest', 'break'] as const) {
    for (const reason of ['next', 'previous'] as const) {
      it.each([
        { remaining: 30, performed: 0, outcome: 'skipped' },
        { remaining: 20, performed: 10, outcome: 'partial' },
        { remaining: 0, performed: 30, outcome: 'completed' },
      ])(`keeps ${kind} behavior on ${reason} with $remaining seconds remaining`, ({ remaining, performed, outcome }) => {
        const performedDurationSeconds = calculatePerformedDurationSeconds(30, remaining, reason, kind)
        expect(performedDurationSeconds).toBe(performed)
        expect(deriveStepOutcome(30, performedDurationSeconds, reason, kind)).toBe(outcome)
      })
    }
    it(`completes an elapsed ${kind}`, () => {
      expect(calculatePerformedDurationSeconds(30, 0, 'elapsed', kind)).toBe(30)
      expect(deriveStepOutcome(30, 30, 'elapsed', kind)).toBe('completed')
    })
  }
})

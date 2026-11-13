import { describe, expect, it } from 'vitest'
import { canEditSparringIntensity, prepareWorkoutFeedback, selectOtherExercises } from './workoutFeedback'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import type { FocusRating, SparringEntry } from './workoutSession.types'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'

const instant = '2026-11-02T11:00:00.000Z'
const previous = { problem: 'Dropped guard', fix: 'Touch chin', sessionId: 'earlier', workoutDate: '2026-11-01' }
const skill: FocusSkill = { id: 'guard', name: 'Guard', criterion: 'Return', openCorrection: previous,
  archivedAt: null, createdAt: instant, updatedAt: instant }
const rating: FocusRating = { workoutItemId: 'exercise-1', focusSkillId: 'guard', skillNameSnapshot: 'Guard',
  criterionSnapshot: 'Return', blockType: 'bag', assessment: null, correction: null, previousCorrectionCheck: null }
const session = () => workoutSession({ stepResults: [sessionStep()], focusRatings: [rating] })

describe('post-workout feedback', () => {
  it.each(['light', 'technical', 'hard', null] as const)('changes only intensity to %s for completed sparring blocks', (intensity) => {
    const sparring: SparringEntry[] = [
      { blockId: 'first', intensity: 'technical', rounds: 3 }, { blockId: 'second', intensity: null, rounds: 1 },
      { blockId: 'skipped', intensity: 'light', rounds: 0 }, { blockId: 'unknown', intensity: null, rounds: null },
      { blockId: null, intensity: 'technical', rounds: 4 },
    ]
    const entry = workoutSession({ sparring })
    const before = structuredClone(entry)
    const update = prepareWorkoutFeedback(entry, { focusRatings: [], exerciseRatings: [], note: 'Notes', sparring: [
      { blockId: 'second', intensity, rounds: 40 }, { blockId: 'first', intensity, rounds: null },
      { blockId: 'skipped', intensity: 'hard', rounds: 5 }, { blockId: 'unknown', intensity: 'hard', rounds: 5 },
      { blockId: null, intensity: 'hard', rounds: 50 }, { blockId: 'extra', intensity: 'hard', rounds: 50 },
    ] }, [], instant)
    expect(update.sparring).toEqual([{ ...sparring[0], intensity }, { ...sparring[1], intensity }, ...sparring.slice(2)])
    expect(update).toMatchObject({ note: 'Notes', updatedAt: instant, correctionUpdates: [] })
    expect(entry).toEqual(before)
  })

  it('preserves recorded values when a sparring block has no draft edit', () => {
    const entry = workoutSession({ sparring: [{ blockId: 'block', intensity: null, rounds: 2 }] })
    expect(prepareWorkoutFeedback(entry, { focusRatings: [], exerciseRatings: [], sparring: [], note: null }, [], instant).sparring).toEqual(entry.sparring)
  })

  it.each([
    [{ blockId: 'block', intensity: null, rounds: 1 }, true],
    [{ blockId: 'block', intensity: 'technical', rounds: 0 }, false],
    [{ blockId: 'block', intensity: null, rounds: null }, false],
    [{ blockId: null, intensity: 'hard', rounds: 3 }, false],
  ] as const)('offers intensity only for eligible sparring: %j', (entry, expected) => {
    expect(canEditSparringIntensity(entry)).toBe(expected)
  })
  it('keeps the later occurrence authoritative when only an earlier saved correction is edited', () => {
    const first = { ...rating, correction: { problem: 'First', fix: 'First fix' } }
    const last = { ...rating, workoutItemId: 'exercise-2', correction: { problem: 'Last', fix: 'Last fix' } }
    const entry = workoutSession({ focusRatings: [first, last], stepResults: [sessionStep(),
      sessionStep({ playbackStepId: 'second', workoutItemId: 'exercise-2' })] })
    expect(prepareWorkoutFeedback(entry, { focusRatings: [{ ...first, correction: { problem: 'Edited first', fix: 'Edited fix' } }, last],
      exerciseRatings: [], sparring: [], note: null }, [skill], instant).correctionUpdates).toEqual([])
  })
  it('offers each other exercise once, with its hot rating, and excludes focus, rest and skipped exercises', () => {
    const entry = workoutSession({ focusRatings: [rating], exerciseRatings: [{ workoutItemId: 'other', nameSnapshot: 'Other', blockType: 'pads', rating: 3 }],
      stepResults: [sessionStep(), sessionStep({ playbackStepId: 'other-1', workoutItemId: 'other', nameSnapshot: 'Other', blockType: 'pads' }),
        sessionStep({ playbackStepId: 'other-2', workoutItemId: 'other' }), sessionStep({ playbackStepId: 'rest', kind: 'roundRest' }),
        sessionStep({ playbackStepId: 'skip', workoutItemId: 'skip', outcome: 'skipped', performedDurationSeconds: 0 })] })
    expect(selectOtherExercises(entry)).toEqual([{ workoutItemId: 'other', nameSnapshot: 'Other', blockType: 'pads', rating: 3 }])
  })
  it.each(['same', 'notChecked', null] as const)('keeps an open correction for %s', (check) => {
    expect(prepareWorkoutFeedback(session(), { focusRatings: [{ ...rating, assessment: 'unableToRate', previousCorrectionCheck: check }],
      exerciseRatings: [], sparring: [], note: null }, [skill], instant)).toMatchObject({
      focusRatings: [{ assessment: 'unableToRate', previousCorrectionCheck: check }], correctionUpdates: [],
    })
  })
  it('does not reopen a saved correction when editing only the workout note later', () => {
    const saved = { ...rating, correction: { problem: 'Problem', fix: 'Fix' }, previousCorrectionCheck: 'better' as const }
    const entry = workoutSession({ focusRatings: [saved], stepResults: [sessionStep()] })
    expect(prepareWorkoutFeedback(entry, { focusRatings: [saved], exerciseRatings: [], sparring: [], note: 'Later note' },
      [{ ...skill, openCorrection: null }], instant).correctionUpdates).toEqual([])
  })
  it('does not close a correction from this or a later workout', () => {
    for (const correction of [{ ...previous, sessionId: 'session-1' }, { ...previous, workoutDate: '2026-11-03' }]) {
      expect(prepareWorkoutFeedback(session(), { focusRatings: [{ ...rating, previousCorrectionCheck: 'better' }],
        exerciseRatings: [], sparring: [], note: null }, [{ ...skill, openCorrection: correction }], instant).correctionUpdates).toEqual([])
    }
  })
  it('keeps the last new correction in plan order when the same skill occurs twice', () => {
    const second = { ...rating, workoutItemId: 'exercise-2', blockType: 'pads' as const }
    const entry = workoutSession({ focusRatings: [rating, second], stepResults: [sessionStep(),
      sessionStep({ playbackStepId: 'second', workoutItemId: 'exercise-2' })] })
    const firstEdit = { ...rating, previousCorrectionCheck: 'better' as const, correction: { problem: 'First problem', fix: 'First fix' } }
    const lastEdit = { ...second, previousCorrectionCheck: 'better' as const, correction: { problem: 'Last problem', fix: 'Last fix' } }
    const result = prepareWorkoutFeedback(entry, { focusRatings: [lastEdit, firstEdit], exerciseRatings: [], sparring: [], note: null }, [skill], instant)
    expect(result.correctionUpdates).toEqual([{ focusSkillId: 'guard', openCorrection: {
      problem: 'Last problem', fix: 'Last fix', sessionId: 'session-1', workoutDate: '2026-11-02',
    } }])
    expect(result.focusRatings.map((value) => value.previousCorrectionCheck)).toEqual(['better', null])
  })
  it('never rates or changes corrections for an exercise without a completed stage', () => {
    const entry = workoutSession({ focusRatings: [rating], stepResults: [sessionStep({ outcome: 'skipped', performedDurationSeconds: 0 })] })
    const result = prepareWorkoutFeedback(entry, { focusRatings: [{ ...rating, assessment: 5,
      correction: { problem: 'Problem', fix: 'Fix' }, previousCorrectionCheck: 'better' }], exerciseRatings: [], sparring: [], note: null }, [skill], instant)
    expect(result).toMatchObject({ focusRatings: [rating], correctionUpdates: [] })
  })
  it('closes a previous correction when the first occurrence is better', () => {
    const entry = session()
    expect(prepareWorkoutFeedback(entry, { focusRatings: [{ ...rating, assessment: 4, previousCorrectionCheck: 'better' }],
      exerciseRatings: [], sparring: [], note: null }, [skill], instant)).toEqual({
      focusRatings: [{ ...rating, assessment: 4, previousCorrectionCheck: 'better' }], exerciseRatings: [], sparring: [],
      note: null, updatedAt: instant, correctionUpdates: [{ focusSkillId: 'guard', openCorrection: null }],
    })
    expect(skill.openCorrection).toEqual(previous)
  })
})

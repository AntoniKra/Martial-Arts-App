import { describe, expect, it } from 'vitest'
import { manualFocusRating, manualWorkoutSession } from '@/test/manualWorkoutBuilder'
import { workoutSession } from '@/test/workoutSessionBuilders'
import { buildManualWorkoutSession, changeManualCategory, createManualWorkoutDraft, findManualWorkoutDuplicate,
  manualFocusPlace, validateManualWorkout, type ManualWorkoutDraft } from './manualWorkoutEntry'
import { isRpeFromMemory } from './rpeRecall'
import { getPreviousCorrection, prepareWorkoutFeedback } from './workoutFeedback'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import { hasFocusSkillEntries, selectFocusSkillAssessments } from '@/domain/focus-skill/focusSkillProgress'

const today = '2026-11-12', now = '2026-11-12T12:00:00.000Z'
const draft = (patch: Partial<ManualWorkoutDraft> = {}): ManualWorkoutDraft => ({
  ...createManualWorkoutDraft(today), disciplineKey: 'boxing', category: 'bag', durationMinutes: '90', rpe: 0, ...patch,
})
const skill: FocusSkill = { id: 'guard', name: 'Guard', criterion: 'Chin', createdAt: now, updatedAt: now, archivedAt: null,
  openCorrection: { problem: 'Guard', fix: 'Chin', sessionId: 'earlier', workoutDate: '2026-11-10' } }

describe('manual workout validation and construction', () => {
  it.each(['2026-11-05', today])('accepts the inclusive date boundary %s and RPE zero', (workoutDate) => {
    expect(validateManualWorkout(draft({ workoutDate }), today).ok).toBe(true)
  })
  it.each([['2026-11-04', 'Data może być najwyżej 7 dni wstecz.'], ['2026-11-13', 'Data nie może być w przyszłości.'],
    ['2026-02-30', 'Wybierz datę treningu.']])('rejects date %s', (workoutDate, error) => {
    expect(validateManualWorkout(draft({ workoutDate }), today)).toMatchObject({ ok: false, errors: { workoutDate: error } })
  })
  it('preserves an old date while editing but rejects changing it to another old day', () => {
    expect(validateManualWorkout(draft({ workoutDate: '2025-01-01' }), today, '2025-01-01').ok).toBe(true)
    expect(validateManualWorkout(draft({ workoutDate: '2025-01-02' }), today, '2025-01-01').ok).toBe(false)
  })
  it.each(['1', '480'])('accepts %s minutes', (durationMinutes) => {
    expect(validateManualWorkout(draft({ durationMinutes }), today).ok).toBe(true)
  })
  it.each(['', '0', '481', '1.5', 'text'])('rejects minutes %s', (durationMinutes) => {
    expect(validateManualWorkout(draft({ durationMinutes }), today).ok).toBe(false)
  })
  it.each([{ disciplineKey: '' }, { category: '' }, { rpe: null }, { rpe: 11 }, { rpe: 1.5 },
    { category: 'sparring', hasSparring: false, intensity: '' }, { hasSparring: true, intensity: '' },
    { hasSparring: true, intensity: 'hard', rounds: '51' }, { hasSparring: true, intensity: 'light', rounds: '1.5' },
    { focusRatings: [{ ...manualFocusRating(), assessment: null }] },
    { category: 'mixed', focusRatings: [{ ...manualFocusRating(), blockType: null }] },
    { category: 'conditioning', focusRatings: [{ ...manualFocusRating(), blockType: null }] },
    { focusRatings: [manualFocusRating({ correction: { problem: 'Problem', fix: '' } })] },
    { focusRatings: [manualFocusRating(), manualFocusRating()] }, { note: 'x'.repeat(1001) },
  ] satisfies Partial<ManualWorkoutDraft>[])('rejects incomplete or invalid input %j', (patch) => {
    expect(validateManualWorkout(draft(patch), today).ok).toBe(false)
  })
  it('builds a complete new entry and preserves identity, timezone and RPE time on unrelated edits', () => {
    const validated = validateManualWorkout(draft({ category: 'sparring', intensity: 'hard', rounds: '6' }), today)
    if (!validated.ok) throw new Error('Invalid fixture')
    const session = buildManualWorkoutSession(validated.values, { id: 'new', now, timezone: 'Europe/Warsaw' })
    expect(session).toMatchObject({ id: 'new', durationSeconds: 5400, rpe: 0, rpeRecordedAt: now, workSeconds: null,
      sparringSeconds: null, completion: null, sparring: [{ blockId: null, intensity: 'hard', rounds: 6 }], createdAt: now, updatedAt: now })
    const later = '2026-11-13T14:00:00.000Z'
    const edited = buildManualWorkoutSession({ ...validated.values, durationMinutes: '120' }, { id: 'ignored', now: later, timezone: 'UTC', original: session })
    expect(edited).toMatchObject({ id: 'new', createdAt: now, timezone: 'Europe/Warsaw', rpeRecordedAt: now, updatedAt: later, durationSeconds: 7200 })
    expect(buildManualWorkoutSession({ ...validated.values, rpe: 7 }, { id: 'new', now: later, timezone: 'UTC', original: session }).rpeRecordedAt).toBe(later)
  })
  it('maps places from the category and requires a new choice for mixed or conditioning', () => {
    for (const category of ['technique', 'pads', 'bag', 'sparring', 'strengthAndConditioning'] as const) expect(manualFocusPlace(category)).toBe(category)
    expect(changeManualCategory(draft({ focusRatings: [manualFocusRating()] }), 'pads').focusRatings[0].blockType).toBe('pads')
    expect(changeManualCategory(draft({ focusRatings: [manualFocusRating()] }), 'mixed').focusRatings[0].blockType).toBeNull()
    expect(manualFocusPlace('conditioning')).toBeNull()
  })
  it('finds the newest duplicate across sources, excludes self and only warns on date/category edits', () => {
    const entry = manualWorkoutSession(), planned = workoutSession({ id: 'plan', workoutDate: today, category: 'bag', createdAt: now })
    expect(findManualWorkoutDuplicate({ workoutDate: today, category: 'bag' }, [planned])).toEqual(planned)
    expect(findManualWorkoutDuplicate(entry, [entry], entry)).toBeNull()
    expect(findManualWorkoutDuplicate(entry, [planned], entry)).toBeNull()
    expect(findManualWorkoutDuplicate({ workoutDate: today, category: 'pads' }, [planned])).toBeNull()
    expect(findManualWorkoutDuplicate(entry, [planned, { ...entry, id: 'newer', createdAt: '2026-11-12T13:00:00.000Z' }])?.id).toBe('newer')
    expect(findManualWorkoutDuplicate({ ...entry, workoutDate: today }, [planned], { ...entry, workoutDate: '2026-11-11' })).toEqual(planned)
  })
})

describe('RPE recall in the saved timezone', () => {
  it.each([['2026-11-14T12:00:00.000Z', false], ['2026-11-15T12:00:00.000Z', true], [null, false]])('marks %s correctly', (rpeRecordedAt, expected) => {
    expect(isRpeFromMemory({ workoutDate: today, rpeRecordedAt, timezone: 'Europe/Warsaw' })).toBe(expected)
  })
  it('uses calendar days across DST and UTC midnight for any session source', () => {
    expect(isRpeFromMemory({ workoutDate: '2026-10-24', timezone: 'Europe/Warsaw', rpeRecordedAt: '2026-10-26T23:30:00.000Z' })).toBe(true)
    expect(isRpeFromMemory({ workoutDate: today, timezone: 'Pacific/Honolulu', rpeRecordedAt: '2026-11-15T08:00:00.000Z' })).toBe(false)
  })
})

describe('manual focus feedback', () => {
  const session = manualWorkoutSession()
  it.each(['same', 'notChecked', null] as const)('keeps the correction for %s', (check) => {
    expect(prepareWorkoutFeedback(session, { focusRatings: [manualFocusRating({ previousCorrectionCheck: check })], note: null }, [skill], now).correctionUpdates).toEqual([])
  })
  it('closes a previous correction with better and lets a new correction replace it', () => {
    const rating = manualFocusRating({ previousCorrectionCheck: 'better' })
    expect(prepareWorkoutFeedback(session, { focusRatings: [rating], note: null }, [skill], now).correctionUpdates).toEqual([{ focusSkillId: skill.id, openCorrection: null }])
    const correction = { problem: 'New problem', fix: 'New fix' }
    expect(prepareWorkoutFeedback(session, { focusRatings: [{ ...rating, correction }], note: null }, [skill], now).correctionUpdates)
      .toEqual([{ focusSkillId: skill.id, openCorrection: { ...correction, sessionId: session.id, workoutDate: today } }])
    expect(getPreviousCorrection({ ...session, workoutDate: '2026-11-09' }, skill)).toBeNull()
  })
  it('does not reopen a saved correction on unrelated edits and keys entries by focusSkillId', () => {
    const rating = manualFocusRating({ correction: { problem: 'Saved', fix: 'Fix' } })
    const entry = manualWorkoutSession({ focusRatings: [rating] })
    expect(prepareWorkoutFeedback(entry, { focusRatings: [rating], note: 'Edited note' }, [{ ...skill, openCorrection: null }], now).correctionUpdates).toEqual([])
  })
  it('includes manual ratings in the stable trend and blocks skill deletion even for unableToRate', () => {
    const manual = manualWorkoutSession({ focusRatings: [manualFocusRating({ assessment: 'unableToRate' })] })
    const plan = workoutSession({ id: 'plan', workoutDate: today, startedAt: '2026-11-12T11:00:00.000Z', focusRatings: [{ ...manualFocusRating(), workoutItemId: 'item' }] })
    const result = selectFocusSkillAssessments(skill, [manual, plan])
    expect(result.map((value) => [value.sessionId, value.planName])).toEqual([['plan', 'Workout'], ['manual', 'Trening poza aplikacją']])
    expect(hasFocusSkillEntries(skill.id, [manual])).toBe(true)
  })
})

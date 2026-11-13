import { describe, expect, it } from 'vitest'
import { workoutPlanDocumentSchema } from '@/infrastructure/firebase/workoutDocumentSchemas'
import { createWorkoutPlaybackTimeline } from '@/domain/workout-playback/createWorkoutPlaybackTimeline'
import { quickTimerConfig, quickTimerPlan } from '@/test/quickTimerBuilders'
import { QUICK_TIMER_CATEGORIES, adjustQuickTimerSeconds, defaultQuickTimerDraft, quickTimerDuration, validateQuickTimerConfig } from './quickTimer'

describe('quick timer configuration and one-off plan', () => {
  it.each(QUICK_TIMER_CATEGORIES)('creates a valid rounds plan for %s without library references', (category) => {
    const plan = quickTimerPlan({ category })
    expect(workoutPlanDocumentSchema.safeParse({ ...plan, schemaVersion: 1 }).success).toBe(true)
    expect(plan.nameSnapshot).toBe('Szybki stoper')
    expect(plan.blocks).toHaveLength(1)
    expect(plan.blocks[0]).toMatchObject({ blockType: category, items: [{ type: 'exercise', combinationId: null, focusSkillId: null, configuration: { mode: 'rounds', roundCount: 3 } }] })
    if (category === 'sparring') expect(plan.blocks[0]).toHaveProperty('sparringIntensity', null)
  })
  it('starts with no category or discipline and reports both missing selections', () => {
    expect(validateQuickTimerConfig(defaultQuickTimerDraft())).toEqual({ ok: false, errors: { category: 'Wybierz rodzaj treningu', disciplineKey: 'Wybierz dyscyplinę' } })
  })
  it.each([
    ['roundCount', 0], ['roundCount', 51], ['roundCount', 1.5], ['roundDurationSeconds', 0], ['roundDurationSeconds', 4],
    ['roundDurationSeconds', 601], ['roundDurationSeconds', 7], ['roundDurationSeconds', 65], ['roundDurationSeconds', NaN],
    ['restBetweenRoundsSeconds', -5], ['restBetweenRoundsSeconds', 301], ['restBetweenRoundsSeconds', 61], ['restBetweenRoundsSeconds', 2.5],
  ] as const)('rejects an out-of-range or off-step %s: %s', (field, value) => {
    expect(validateQuickTimerConfig(quickTimerConfig({ format: 'custom', [field]: value }))).toMatchObject({ ok: false, errors: { [field]: expect.any(String) } })
  })
  it.each([
    { roundCount: 1, roundDurationSeconds: 5, restBetweenRoundsSeconds: 0 },
    { roundCount: 50, roundDurationSeconds: 600, restBetweenRoundsSeconds: 300 },
    { roundCount: 3, roundDurationSeconds: 60, restBetweenRoundsSeconds: 75 },
  ])('accepts inclusive bounds and step changes: %j', (values) => {
    expect(validateQuickTimerConfig(quickTimerConfig({ ...values, format: 'custom' })).ok).toBe(true)
  })
  it('rejects stale preset values and totals only the rests between rounds', () => {
    expect(validateQuickTimerConfig(quickTimerConfig({ roundCount: 2 }))).toMatchObject({ ok: false, errors: { format: expect.any(String) } })
    expect(quickTimerDuration(quickTimerConfig())).toBe(660)
    expect(quickTimerDuration(quickTimerConfig({ roundCount: 1 }))).toBe(180)
    const plan = quickTimerPlan({ format: 'custom', roundCount: 50, restBetweenRoundsSeconds: 0 })
    expect(createWorkoutPlaybackTimeline(plan).steps).toHaveLength(50)
  })
  it.each([[55, 1, 60], [60, 1, 75], [75, -1, 60], [60, -1, 55], [5, -1, 5], [600, 1, 600]] as const)('adjusts %s by direction %s to %s', (value, direction, expected) => {
    expect(adjustQuickTimerSeconds(value, direction, 5, 600)).toBe(expected)
  })
})

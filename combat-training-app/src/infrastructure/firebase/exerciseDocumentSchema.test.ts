import { describe, expect, it } from 'vitest'
import { exerciseDocumentSchema } from './exerciseDocumentSchema'
import { personalExercise } from '@/test/exerciseBuilders'
import { focusSkillDocumentSchema } from './focusSkillDocumentSchema'
import { workoutDocumentVersion } from './workoutDocumentVersion'
import { workoutSessionDocumentSchema } from './workoutDocumentSchemas'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'
import { validateExerciseDefinition } from '@/features/exercises/validateExerciseDefinition'
import { buildExercisesCsv } from '@/features/account/dataExport'

const value = () => ({ ...personalExercise(), schemaVersion: 1 })
describe('personal exercise document boundary', () => {
  it('accepts both configurations and optional provenance, including documented bounds', () => {
    expect(exerciseDocumentSchema.parse(value())).toEqual(value())
    expect(exerciseDocumentSchema.safeParse({ ...value(), copiedFromId: 'combo-jab-cross', type: 'combination', defaultConfiguration:
      { mode: 'rounds', roundCount: 99, roundDurationSeconds: 86400, restBetweenRoundsSeconds: 0 } }).success).toBe(true)
    expect(exerciseDocumentSchema.safeParse({ ...value(), type: 'continuous', defaultConfiguration: { mode: 'continuous', durationSeconds: 1 } }).success).toBe(true)
  })
  it.each([
    { schemaVersion: 2 }, { extra: true }, { namePl: '' }, { namePl: ' ' }, { namePl: 'x'.repeat(101) }, { id: 'bad/id' },
    { type: 'strength' }, { disciplines: [] }, { disciplines: ['boxing', 'boxing'] }, { disciplines: ['wrestling'] },
    { blockTypes: [] }, { blockTypes: ['bag', 'bag'] }, { blockTypes: ['unknown'] }, { favorite: 'true' }, { lastUsedAt: 'yesterday' },
    { copiedFromId: null }, { archivedAt: 1 }, { createdAt: 'invalid' },
    ...[0, -1, 1.5, 86401, '60'].map((durationSeconds) => ({ defaultConfiguration: { mode: 'continuous', durationSeconds } })),
    ...[0, 100, 1.5].map((roundCount) => ({ defaultConfiguration: { mode: 'rounds', roundCount, roundDurationSeconds: 60, restBetweenRoundsSeconds: 0 } })),
    { defaultConfiguration: { mode: 'continuous', durationSeconds: 60, extra: true } },
  ])('rejects malformed fields %j', (patch) => expect(exerciseDocumentSchema.safeParse({ ...value(), ...patch }).success).toBe(false))
  it.each(Object.keys(value()))('rejects a missing required %s', (key) => {
    const missing: Record<string, unknown> = value(); delete missing[key]
    expect(exerciseDocumentSchema.safeParse(missing).success).toBe(false)
  })
  it('keeps legacy focus skills unchanged and requires v2 only for the optional link', () => {
    const skill = { schemaVersion: 1, id: 'skill', name: 'Guard', criterion: 'Chin', openCorrection: null, archivedAt: null,
      createdAt: value().createdAt, updatedAt: value().updatedAt }
    expect(focusSkillDocumentSchema.parse(skill)).toEqual(skill)
    const linked = { ...skill, exerciseId: 'personal', schemaVersion: 2 }
    expect(focusSkillDocumentSchema.parse(linked)).toEqual(linked)
    expect(workoutDocumentVersion(linked)).toBe(2)
    expect(focusSkillDocumentSchema.safeParse({ ...linked, schemaVersion: 1 }).success).toBe(false)
    expect(focusSkillDocumentSchema.safeParse({ ...linked, exerciseId: 'bad/id' }).success).toBe(false)
  })
  it('retains v1 history and validates new snapshot references as v2', () => {
    const old = { ...workoutSession({ stepResults: [sessionStep()] }), schemaVersion: 1 }
    expect(workoutSessionDocumentSchema.parse(old)).toEqual(old)
    const session = { ...old, schemaVersion: 2, stepResults: [sessionStep({ combinationId: 'personal' })] }
    expect(workoutDocumentVersion(session)).toBe(2)
    expect(workoutSessionDocumentSchema.parse(session)).toEqual(session)
    expect(workoutSessionDocumentSchema.safeParse({ ...session, stepResults: [sessionStep({ combinationId: 'bad/id' })] }).success).toBe(false)
  })
  it('validates controlled form values including empty selections and fractional or missing time', () => {
    expect(validateExerciseDefinition(personalExercise())).toEqual([])
    expect(validateExerciseDefinition(personalExercise({ namePl: ' ', disciplines: [], defaultConfiguration: { mode: 'continuous', durationSeconds: Number.NaN } }))).toHaveLength(3)
    expect(validateExerciseDefinition(personalExercise({ defaultConfiguration: { mode: 'rounds', roundCount: 1.5, roundDurationSeconds: 60, restBetweenRoundsSeconds: 0 } }))).toHaveLength(1)
  })
  it('exports all exercise metadata in BOM CSV and escapes names safely', () => {
    const csv = buildExercisesCsv([personalExercise({ namePl: '=1+1', copiedFromId: 'builtin', favorite: true, archivedAt: value().createdAt })])
    expect(csv.startsWith('\uFEFFID;Nazwa;')).toBe(true)
    expect(csv).toContain("personal-guard;'=1+1;Zadanie;Boks;Technika | Worek;rounds;3;180;60;builtin;")
    expect(csv).toContain(';tak;')
  })
})

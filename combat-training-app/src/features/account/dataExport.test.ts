import { describe, expect, it } from 'vitest'
import { workoutSession } from '@/test/workoutSessionBuilders'
import type { ManualWorkoutSession, QuickTimerWorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { buildAccountJson, buildJournalCsv, csvCell, exportFileName } from './dataExport'
import { accountLabels } from './accountLabels'

const instant = '2026-11-13T09:00:00.000Z'
const plan = workoutSession({ id: 'plan', durationSeconds: 90, workSeconds: 60, sparringSeconds: 0, workoutDate: '2026-11-10',
  note: 'tekst; "cytat"\nnowa linia', completion: { completed: 2, planned: 3, unit: 'exercise' },
  rpe: 0, rpeRecordedAt: instant,
  focusRatings: [{ workoutItemId: 'item', focusSkillId: 'focus', skillNameSnapshot: 'Nazwa', criterionSnapshot: 'Kryterium', blockType: 'bag', assessment: 4, correction: null, previousCorrectionCheck: null }] })
const manual: ManualWorkoutSession = { id: 'manual', source: 'manual', status: 'completed', disciplineKey: 'boxing', category: 'bag',
  workoutDate: '2026-11-11', timezone: 'Europe/Warsaw', durationSeconds: 600, workSeconds: null, sparringSeconds: null, completion: null,
  note: '=1+1', rpe: 3, rpeRecordedAt: instant, sparring: [], focusRatings: [], createdAt: instant, updatedAt: instant }
const { workoutPlanId: _id, workoutPlanNameSnapshot: _name, focusRatings: _focus, exerciseRatings: _ratings, ...timed } = plan
const quick: QuickTimerWorkoutSession = { ...timed, id: 'quick', source: 'quickTimer', workoutDate: '2026-11-12', note: null,
  completion: { completed: 2, planned: 3, unit: 'round' }, sparring: [{ blockId: null, intensity: null, rounds: null }] }

describe('data export', () => {
  it('exports raw invalid documents in id order without changing fields or adding ids, with no profile', () => {
    const invalid = { schemaVersion: 99, strange: ['raw', 7] }
    const json = buildAccountJson({ profile: null, collections: { workoutSessions: [
      { id: 'z', data: invalid }, { id: 'a', data: { schemaVersion: 1, untouched: true } },
    ], bodyWeights: [] } }, { uid: 'athlete', email: 'athlete@example.test' }, new Date(instant))
    expect(JSON.parse(json)).toEqual({ format: 'combat-training-export', formatVersion: 1, exportedAt: instant,
      account: { uid: 'athlete', email: 'athlete@example.test' }, profile: null,
      collections: { workoutSessions: [{ schemaVersion: 1, untouched: true }, invalid], bodyWeights: [] } })
    expect(json).toContain('\n  "format"')
  })
  it('preserves the entire raw profile', () => {
    expect(JSON.parse(buildAccountJson({ profile: { unknown: true }, collections: {} },
      { uid: 'a', email: 'a@example.test' }, new Date(instant))).profile).toEqual({ unknown: true })
  })
  it('builds BOM and semicolon CSV for all sources, escapes notes, uses decimal commas and leaves unknown values empty', () => {
    const csv = buildJournalCsv([quick, manual, plan])
    expect(csv.startsWith('\uFEFF' + accountLabels.csvHeaders.join(';') + '\r\n')).toBe(true)
    expect(csv).toContain('1,5;1,0;0,0;2/3 ćwiczeń;0;')
    expect(csv).toContain(';tak;')
    expect(csv).toContain('Nazwa: 4 (Worek)')
    expect(csv).toContain('"tekst; ""cytat""\nnowa linia"')
    expect(csv).toContain(';10,0;;;;3;')
    expect(csv).toContain(";'=1+1\r\n")
    expect(csv).toContain(';Szybki stoper;')
    expect(csv).toContain(';2/3 rund;')
    expect(csv.indexOf('2026-11-10;')).toBeLessThan(csv.indexOf('2026-11-11;'))
    expect(csv.indexOf('2026-11-11;')).toBeLessThan(csv.indexOf('2026-11-12;'))
  })
  it('orders the same workout date by startedAt or createdAt and then id', () => {
    const entry = { ...manual, workoutDate: '2026-11-10' }
    const csv = buildJournalCsv([{ ...entry, id: 'z', note: 'last' }, { ...entry, id: 'a', note: 'first' },
      { ...plan, startedAt: '2026-11-10T00:00:00.000Z', note: 'earliest' }])
    expect(csv.indexOf('earliest')).toBeLessThan(csv.indexOf('first'))
    expect(csv.indexOf('first')).toBeLessThan(csv.indexOf('last'))
  })
  it.each(['=1+1', '+1', '-1', '@SUM(A1)', '\tvalue', '\rvalue'])('protects a formula-like cell %j', (value) => {
    expect(csvCell(value).replaceAll('"', '')).toBe("'" + value)
  })
  it('uses local calendar dates for filenames', () => {
    const date = new Date(2026, 0, 2, 0, 1)
    expect(exportFileName('json', date)).toBe('combat-training-dane-2026-01-02.json')
    expect(exportFileName('csv', date)).toBe('combat-training-dziennik-2026-01-02.csv')
  })
})

it('leaves unknown aggregate cells empty and excludes unassessed focus ratings', () => {
  const csv = buildJournalCsv([{ ...plan, note: null, focusRatings: [{ ...plan.focusRatings[0], assessment: null }],
    sparring: [{ blockId: 'a', intensity: null, rounds: null }, { blockId: 'b', intensity: null, rounds: null }] }])
  expect(csv).not.toContain('Nazwa:')
  expect(csv).not.toContain(' | ')
  expect(csv).toContain(';tak;;;;\r\n')
})

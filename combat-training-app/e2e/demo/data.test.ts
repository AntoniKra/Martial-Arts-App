import { describe, expect, it } from 'vitest'
import { createDemoData } from './data'
import { demoDocuments } from './seed'
import { assertDemoTarget, demoAuthOrigin, demoFirestoreOrigin, encodeFirestore } from './emulator'
import { shiftCalendarDate, weekStartForDate } from '../../src/domain/week-plan/weekCalendar'
import { calculateScheduledWeek } from '../../src/domain/week-plan/scheduledWeek'
import { wellbeingBaseline } from '../../src/domain/wellbeing/wellbeing'
import { focusCardSummary, progressWeeks } from '../../src/domain/weekly-summary/progressOverview'
import { selectFocusSkillAssessments } from '../../src/domain/focus-skill/focusSkillProgress'
import { combineWeekPlanDocuments } from '../../src/infrastructure/firebase/weekPlanDocumentSchema'
import { combineRecurringWeekRecords, recurringWeekRecordSchema } from '../../src/infrastructure/firebase/recurringWeekDocumentSchema'

describe('shared demo history', () => {
  it.each(['2026-11-16T00:00:00.000Z', '2027-01-01T12:00:00.000Z', '2028-03-26T23:30:00.000Z', '2028-10-29T23:30:00.000Z'])(
    'keeps fourteen complete weeks and one two-week gap relative to %s', (instant) => {
      const data = createDemoData(new Date(instant))
      expect(createDemoData(new Date(instant), 'ola')).toEqual(data)
      const weeks = Array.from({ length: 14 }, (_, index) => shiftCalendarDate(data.firstWeek, index * 7))
      const counts = weeks.map((week) => data.demoSessions.filter((session) => weekStartForDate(session.workoutDate) === week).length)
      expect(data.firstWeek).toBe(shiftCalendarDate(data.currentWeek, -98))
      expect(counts.flatMap((count, index) => count === 0 ? [index] : [])).toEqual([5, 6])
      expect(counts.filter(Boolean).every((count) => count >= 2 && count <= 5)).toBe(true)
      expect(data.demoSessions.every((session) => session.workoutDate < data.currentWeek)).toBe(true)
      expect(data.demoSessions).toHaveLength(40)
      expect(progressWeeks(data.demoSessions, data.currentWeek)).toHaveLength(12)
      expect(() => demoDocuments(data)).not.toThrow()
    },
  )

  const data = createDemoData(new Date('2026-11-19T12:00:00.000Z'))
  it('contains complete and partial playback, manual v2 parts, and known sparring', () => {
    expect(new Set(data.demoSessions.map((session) => session.source))).toEqual(new Set(['plan', 'quickTimer', 'manual']))
    expect(data.demoSessions.some((session) => session.status === 'partial')).toBe(true)
    expect(data.demoSessions.filter((session) => session.source === 'manual').every((session) => session.parts?.length)).toBe(true)
    expect(data.demoSessions.flatMap((session) => session.sparring).every((entry) => entry.rounds !== null && entry.intensity !== null)).toBe(true)
    expect(data.demoSessions.every((session) => session.rpe !== null && session.note)).toBe(true)
  })

  it('has eight rising, eight stable and three archived assessments, without gap imputations', () => {
    const ratings = data.demoSessions.flatMap((session) => session.source === 'plan' ? session.focusRatings : [])
    const bySkill = (id: string) => ratings.filter((rating) => rating.focusSkillId === id).map((rating) => rating.assessment)
    expect(bySkill('guard')).toEqual([2, 2, 2, 2, 3, 4, 4, 5])
    expect(bySkill('low-kick')).toEqual(Array(8).fill(3))
    expect(bySkill('exit')).toHaveLength(3)
    expect(data.demoSkills.filter((skill) => skill.archivedAt)).toHaveLength(1)
    expect(data.demoSkills[0].openCorrection?.sessionId).toBe('plan-week-13')
    expect(focusCardSummary(selectFocusSkillAssessments(data.demoSkills[0], data.demoSessions)).trend).toBe('↑ z 4')
    expect(focusCardSummary(selectFocusSkillAssessments(data.demoSkills[1], data.demoSessions)).trend).toBe('bez zmian')
  })

  it('provides separate adult consents and an available wellbeing norm', () => {
    expect(data.demoProfile.healthDataConsent?.adultConfirmed).toBe(true)
    expect(data.demoProfile.wellbeingConsent?.adultConfirmed).toBe(true)
    expect(data.demoWellbeing).toHaveLength(35)
    expect(wellbeingBaseline(data.demoWellbeing, data.today, 1).norms.sleep).not.toBeNull()
    expect(data.demoWeights).toHaveLength(20)
    expect(data.demoWeights.every((weight) => weight.date <= data.today)).toBe(true)
    expect(data.demoExercises).toHaveLength(3)
  })

  it('round-trips split v2 weeks and recurring records used by the current app', () => {
    const documents = demoDocuments(data)
    for (const week of data.demoWeeks) {
      const stored = documents.filter((doc) => doc.path === `weekPlans/${week.weekStart}` || doc.path.startsWith(`weekPlans/${week.weekStart}~`))
      expect(combineWeekPlanDocuments(stored.map((doc) => ({ id: doc.path.split('/')[1], data: doc.data })))).toEqual(week)
    }
    const recurring = documents.filter((doc) => doc.path.startsWith('recurringWeeks/')).map((doc) => recurringWeekRecordSchema.parse(doc.data))
    expect(combineRecurringWeekRecords(recurring)).toEqual(data.demoRecurring)
    const week = data.demoWeeks[13]
    const result = calculateScheduledWeek(week, data.demoSessions, data.today)
    expect(new Set(result.matches.map((match) => match.status))).toEqual(new Set(['done', 'omitted', 'missed']))
    expect(result.extra).toHaveLength(1)
    expect(week.schedule?.find((item) => item.id.endsWith(':flexible'))?.day).toBe(3)
  })

  it('validates the entire dataset before writes and provides a genuinely empty variant', () => {
    expect(() => demoDocuments({ ...data, demoWeights: [{ ...data.demoWeights[0], weightKg: -1 }] })).toThrow()
    const empty = demoDocuments(data, true)
    expect(empty).toHaveLength(1)
    expect(empty[0]).toMatchObject({ path: '', data: { healthDataConsent: null, wellbeingConsent: null, weightClassLabel: null } })
  })
})

describe('showcase histories', () => {
  it.each([
    ['kuba', 'boxing', [2, 1, 2, 2, 1, 2, 1, 2], 13, 52],
    ['marek', 'kickboxing', [5, 5, 5, 4, 5, 5, 5, 4, 3, 1, 5, 4, 5, 5, 5, 4], 70, 109],
  ] as const)('validates the complete %s dataset and dates across Warsaw calendar boundaries',
    (persona, discipline, counts, total, lastDay) => {
      for (const instant of ['2026-11-15T23:00:00.000Z', '2027-01-01T12:00:00.000Z', '2028-03-26T22:00:00.000Z']) {
        const now = new Date(instant)
        const data = createDemoData(now, persona)
        const weeks = Array.from({ length: counts.length + 1 }, (_, index) => shiftCalendarDate(data.firstWeek, index * 7))
        expect(data.firstWeek).toBe(shiftCalendarDate(data.currentWeek, -counts.length * 7))
        expect(data.demoWeeks.map((week) => week.weekStart)).toEqual(weeks)
        expect(weeks.slice(0, -1).map((week) => data.demoSessions.filter((session) => weekStartForDate(session.workoutDate) === week).length)).toEqual(counts)
        expect(data.demoSessions).toHaveLength(total)
        expect(data.demoSessions[0].workoutDate).toBe(data.firstWeek)
        expect(data.demoSessions.at(-1)?.workoutDate).toBe(shiftCalendarDate(data.firstWeek, lastDay))
        expect(data.demoSessions.every((session) => session.disciplineKey === discipline && session.workoutDate < data.currentWeek)).toBe(true)
        expect(data.demoWeeks.every((week) => week.weekStart <= data.today && Date.parse(week.createdAt) <= now.getTime())).toBe(true)
        expect(data.demoWellbeing.every((entry) => entry.date <= data.today)).toBe(true)
        const documents = demoDocuments(data)
        expect(new Set(documents.map((doc) => doc.path)).size).toBe(documents.length)
        expect(documents.filter((doc) => doc.path.startsWith('workoutSessions/'))).toHaveLength(total)
      }
    },
  )

  const now = new Date('2026-11-21T12:00:00.000Z')

  it('shows three missed sessions and early boxing improvement for Kuba', () => {
    const data = createDemoData(now, 'kuba')
    const matches = data.demoWeeks.flatMap((week) => calculateScheduledWeek(week, data.demoSessions, data.today).matches)
    expect(matches.filter((entry) => entry.status === 'missed')).toHaveLength(3)
    expect(data.demoWellbeing).toHaveLength(4)
    expect(data.demoWeights).toEqual([])
    expect(data.demoProfile.healthDataConsent).toBeNull()
    const ratings = data.demoSessions.flatMap((session) => session.source === 'plan' ? session.focusRatings : [])
    for (const skill of data.demoSkills) {
      const scores = ratings.filter((rating) => rating.focusSkillId === skill.id).map((rating) => rating.assessment)
      expect(scores[0]).toBe(1)
      expect(scores.at(-1)).toBe(5)
    }
    expect([...new Set(data.demoSessions.map((session) => session.rpe))].sort()).toEqual([4, 5, 6, 7])
  })

  it('shows a ten-day break, regular lighter weeks and hard sparring for Marek', () => {
    const data = createDemoData(now, 'marek')
    const days = data.demoSessions.map((session) => session.workoutDate)
    expect(days.filter((day) => day >= shiftCalendarDate(data.firstWeek, 59) && day <= shiftCalendarDate(data.firstWeek, 68))).toEqual([])
    expect(days).toContain(shiftCalendarDate(data.firstWeek, 58))
    expect(days).toContain(shiftCalendarDate(data.firstWeek, 69))
    expect(data.demoRecurring.items).toHaveLength(5)
    for (const week of [3, 7, 11, 15]) {
      const sessions = data.demoSessions.filter((session) => weekStartForDate(session.workoutDate) === data.demoWeeks[week].weekStart)
      expect(sessions).toHaveLength(4)
      expect(sessions.every((session) => (session.rpe ?? 10) <= 6)).toBe(true)
      expect(sessions.find((session) => session.category === 'sparring')?.sparring[0].intensity).toBe('technical')
    }
    expect(data.demoSessions.filter((session) => session.sparring.some((entry) => entry.intensity === 'hard'))).toHaveLength(10)
    for (const session of data.demoSessions) {
      if (session.source !== 'plan') throw new Error('Expected a plan session')
      const plan = data.demoPlans.find(({ id }) => id === session.workoutPlanId)!
      const exercise = plan.blocks[1].items[0]
      if (exercise.type !== 'exercise' || exercise.configuration.mode !== 'rounds') throw new Error('Expected rounds')
      const rounds = session.stepResults.filter((step) => step.blockId === plan.blocks[1].id && step.kind === 'exercise')
      expect(rounds).toHaveLength(exercise.configuration.roundCount)
      expect(rounds.every((step) => step.performedDurationSeconds === 180)).toBe(true)
      expect(session.completedAt <= now.toISOString() && (session.rpeRecordedAt ?? '') <= now.toISOString()).toBe(true)
    }
  })
})

describe('local-only fixture transport', () => {
  it.each([demoAuthOrigin, demoFirestoreOrigin])('accepts a demo project only at %s', (origin) => {
    expect(() => assertDemoTarget('demo-combat-training', origin)).not.toThrow()
    expect(() => assertDemoTarget('combat-training', origin)).toThrow()
  })
  it.each(['https://firestore.googleapis.com', 'http://example.test:8080', 'http://127.0.0.1:8081', 'http://127.0.0.1:8080.evil.test'])(
    'rejects a non-emulator target %s', (origin) => expect(() => assertDemoTarget('demo-combat-training', origin)).toThrow(),
  )
  it('encodes nested REST documents without losing nulls, empty arrays or number types', () => {
    expect(encodeFirestore({ n: null, empty: [], values: [1, 1.5, true, 'x'] })).toEqual({ mapValue: { fields: {
      n: { nullValue: null }, empty: { arrayValue: { values: [] } }, values: { arrayValue: { values: [
        { integerValue: '1' }, { doubleValue: 1.5 }, { booleanValue: true }, { stringValue: 'x' },
      ] } },
    } } })
    expect(() => encodeFirestore(undefined)).toThrow()
  })
})

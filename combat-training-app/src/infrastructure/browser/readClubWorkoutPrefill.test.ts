import { describe, expect, it } from 'vitest'
import { clubWorkoutPrefill } from '@/domain/week-plan/clubWorkoutPrefill'
import { readClubWorkoutPrefill } from './readClubWorkoutPrefill'
import type { ScheduledWeekItem } from '@/domain/week-plan/weekPlan.types'

const club: ScheduledWeekItem = { id: 'club', kind: 'club', day: 1, disciplineKey: 'muay_thai', startTime: '19:00', endTime: '20:30', parts: ['technique'], clubName: null, omitted: false }
describe('club entry prefill', () => {
  it('passes an editable date, discipline, parts and duration while leaving RPE out', () => {
    const value = clubWorkoutPrefill('2026-11-09', club, '2026-11-10')
    expect(readClubWorkoutPrefill(value, '2026-11-10')).toEqual({ workoutDate: '2026-11-10', weekStart: '2026-11-09', disciplineKey: 'muay_thai', parts: ['technique'], durationMinutes: '90' })
  })
  it('rejects future, expired, foreign-week and malformed external prefill', () => {
    const value = clubWorkoutPrefill('2026-11-09', club, '2026-11-10')
    expect(clubWorkoutPrefill('2026-11-09', club, '2026-11-09')).toBeNull()
    expect(clubWorkoutPrefill('2026-11-09', club, '2026-11-18')).toBeNull()
    for (const fields of [{ workoutDate: '2026-11-11' }, { weekStart: '2026-11-02' }, { parts: ['mixed'] }, { disciplineKey: 'judo' }, { durationMinutes: '481' }, { rpe: 5 }]) {
      expect(readClubWorkoutPrefill({ ...value, ...fields }, '2026-11-10')).toBeUndefined()
    }
    expect(readClubWorkoutPrefill(value, '2026-11-18')).toBeUndefined()
  })
})

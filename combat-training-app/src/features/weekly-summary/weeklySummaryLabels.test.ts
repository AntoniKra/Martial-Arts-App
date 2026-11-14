import { describe, expect, it } from 'vitest'
import { calculateWeeklySummary } from '@/domain/weekly-summary/weeklySummary'
import { workoutSession } from '@/test/workoutSessionBuilders'
import { formatComparisonLoadPl } from './weeklySummaryLabels'

const week = '2026-11-09'
const entry = (id: string, rpe: number | null) => workoutSession({ id, workoutDate: week, durationSeconds: 1800, rpe })

describe('comparison load formatting', () => {
  it('marks a partial positive sum and a known zero with the number of missing RPE responses', () => {
    expect(formatComparisonLoadPl(calculateWeeklySummary(week, [entry('known', 3), entry('missing', null)]))).toBe('90 j.u. (bez RPE: 1)')
    expect(formatComparisonLoadPl(calculateWeeklySummary(week, [entry('zero', 0), entry('a', null), entry('b', null)]))).toBe('0 j.u. (bez RPE: 2)')
  })
  it('keeps missing data, complete load and an empty week distinct', () => {
    expect(formatComparisonLoadPl(calculateWeeklySummary(week, [entry('missing', null)]))).toBe('Brak danych')
    expect(formatComparisonLoadPl(calculateWeeklySummary(week, [entry('known', 3)]))).toBe('90 j.u.')
    expect(formatComparisonLoadPl(calculateWeeklySummary(week, []))).toBe('0 j.u.')
  })
})

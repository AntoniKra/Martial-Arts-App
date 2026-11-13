import { shiftCalendarDate, weekStartForDate } from '@/domain/week-plan/weekCalendar'
import type { AthleteProfile, BodyWeight } from './profile.types'

export const HEALTH_NOTICE_VERSION = '2026-11'

export function hasValidHealthConsent(profile: AthleteProfile | null | undefined): boolean {
  return profile?.healthDataConsent?.adultConfirmed === true
}

export function isMeasurementDate(date: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) return false
  const parsed = new Date(`${date}T12:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
}

export function parseWeightKg(input: string): number | null {
  const text = input.trim()
  if (!/^\d+(?:[.,]\d+)?$/.test(text)) return null
  const value = Number(text.replace(',', '.'))
  return Number.isFinite(value) && value >= 30 && value <= 250 ? Math.round((value + Number.EPSILON) * 10) / 10 : null
}

/** Empty text removes the optional label; undefined means invalid input. */
export function parseWeightClassLabel(input: string): string | null | undefined {
  const label = input.trim()
  return label.length > 20 ? undefined : label || null
}

const average = (weights: readonly BodyWeight[]) => weights.length
  ? Math.round((weights.reduce((sum, entry) => sum + entry.weightKg, 0) / weights.length + Number.EPSILON) * 10) / 10 : null

export function calculateSevenDayWeight(weights: readonly BodyWeight[], today: string) {
  const start = shiftCalendarDate(today, -6)
  const selected = weights.filter((entry) => entry.date >= start && entry.date <= today)
  const latest = [...weights].filter((entry) => entry.date <= today).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
  return { start, end: today, averageKg: average(selected), count: selected.length, latest }
}

export interface WeeklyWeightPoint {
  weekStart: string
  averageKg: number | null
  count: number
  isCurrent: boolean
}

export function calculateWeeklyWeights(weights: readonly BodyWeight[], today: string): WeeklyWeightPoint[] {
  const current = weekStartForDate(today)
  return Array.from({ length: 12 }, (_, index) => {
    const weekStart = shiftCalendarDate(current, (index - 11) * 7)
    const weekEnd = shiftCalendarDate(weekStart, 6)
    const selected = weights.filter((entry) => entry.date >= weekStart && entry.date <= weekEnd && entry.date <= today)
    return { weekStart, averageKg: average(selected), count: selected.length, isCurrent: weekStart === current }
  })
}

/** No batch exceeds 499 writes, including the final profile update. */
export function createConsentWithdrawalBatches(ids: readonly string[]): { ids: string[]; withdrawConsent: boolean }[] {
  const batches: { ids: string[]; withdrawConsent: boolean }[] = []
  let offset = 0
  while (ids.length - offset >= 499) {
    batches.push({ ids: ids.slice(offset, offset + 499), withdrawConsent: false })
    offset += 499
  }
  batches.push({ ids: ids.slice(offset), withdrawConsent: true })
  return batches
}

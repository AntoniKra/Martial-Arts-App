import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import { calendarDaysBetween } from '@/domain/workout-session/rpeRecall'

export const WELLBEING_QUESTIONS_VERSION = 1
export const WELLBEING_NOTE_LIMIT = 300
export const WELLBEING_FIELDS = ['sleep', 'energy', 'soreness', 'stress'] as const
export type WellbeingField = typeof WELLBEING_FIELDS[number]
export type WellbeingCategory = 'worse' | 'typical' | 'better'
export type WellbeingAnswers = Record<WellbeingField, number>
export interface WellbeingEntry extends WellbeingAnswers {
  date: string
  note: string | null
  questionsVersion: number
  createdAt: string
  updatedAt: string
}
export interface WellbeingNorm { median: number; p25: number; p75: number }

export function validateWellbeing(answers: Record<WellbeingField, number | null>, note: string): boolean {
  return WELLBEING_FIELDS.every((field) => Number.isInteger(answers[field]) && answers[field]! >= 1 && answers[field]! <= 5)
    && note.trim().length <= WELLBEING_NOTE_LIMIT
}

/** Linear interpolation at (n - 1) * p (R type 7); ties stay equal. */
function quantile(values: readonly number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b), index = (sorted.length - 1) * p
  const low = Math.floor(index), fraction = index - low
  return sorted[low] + fraction * (sorted[Math.ceil(index)] - sorted[low])
}

export function wellbeingBaseline(entries: readonly WellbeingEntry[], date: string, version: number) {
  const start = shiftCalendarDate(date, -28)
  const selected = entries.filter((entry) => entry.date >= start && entry.date < date && entry.questionsVersion === version)
    .sort((a, b) => a.date.localeCompare(b.date))
  // A span includes both the first and last calendar day; omitted days are never filled in.
  const spanDays = selected.length ? calendarDaysBetween(selected[0].date, selected.at(-1)!.date) + 1 : 0
  const ready = selected.length >= 14 && spanDays >= 21
  const norms = Object.fromEntries(WELLBEING_FIELDS.map((field) => {
    const values = selected.map((entry) => entry[field])
    return [field, ready ? { median: quantile(values, .5), p25: quantile(values, .25), p75: quantile(values, .75) } : null]
  })) as Record<WellbeingField, WellbeingNorm | null>
  return { norms, count: selected.length, spanDays, missingEntries: Math.max(0, 14 - selected.length) }
}

export function categorizeWellbeing(value: number, norm: WellbeingNorm): WellbeingCategory {
  return value < norm.p25 ? 'worse' : value > norm.p75 ? 'better' : 'typical'
}

export function describeWellbeing(entries: readonly WellbeingEntry[], entry: WellbeingEntry) {
  const baseline = wellbeingBaseline(entries, entry.date, entry.questionsVersion)
  const previous = entries.filter((item) => item.date <= entry.date).sort((a, b) => b.date.localeCompare(a.date))
  const fields = WELLBEING_FIELDS.map((field) => {
    const norm = baseline.norms[field], category = norm ? categorizeWellbeing(entry[field], norm) : null
    let worseEntries = 0
    if (category === 'worse') for (const item of previous) {
      if (item.questionsVersion !== entry.questionsVersion) break
      const priorNorm = wellbeingBaseline(entries, item.date, item.questionsVersion).norms[field]
      if (!priorNorm || categorizeWellbeing(item[field], priorNorm) !== 'worse') break
      worseEntries++
    }
    return { field, norm, category, worseEntries }
  })
  return { ...baseline, fields }
}

export function wellbeingWorkoutContext(entries: readonly WellbeingEntry[], date: string): WellbeingField[] | null {
  const entry = entries.find((item) => item.date === date)
  if (!entry) return null
  const description = describeWellbeing(entries, entry)
  if (!description.fields.every((field) => field.category !== null)) return null
  return description.fields.filter((field) => field.category === 'worse').map((field) => field.field)
}

import { shiftCalendarDate, weekStartForDate } from '@/domain/week-plan/weekCalendar'

export interface HistoryWeek<T> { start: string; end: string; sessions: T[]; emptyWeeks: number }

/** Collapse only gaps inside the journal, never invent weeks before the first entry. */
export function groupHistoryWeeks<T extends { workoutDate?: string; completedAt: string }>(sessions: readonly T[], currentWeek: string): HistoryWeek<T>[] {
  const grouped = new Map<string, T[]>()
  for (const session of sessions) {
    const week = weekStartForDate(session.workoutDate ?? session.completedAt.slice(0, 10))
    grouped.set(week, [...(grouped.get(week) ?? []), session])
  }
  const first = [...grouped.keys()].sort()[0]
  if (!first) return []
  const last = [...grouped.keys()].sort().at(-1)!
  const result: HistoryWeek<T>[] = []
  for (let start = last > currentWeek ? last : currentWeek; start >= first; start = shiftCalendarDate(start, -7)) {
    const items = grouped.get(start) ?? []
    const previous = result.at(-1)
    if (!items.length && previous?.emptyWeeks) { previous.start = start; previous.emptyWeeks++ }
    else result.push({ start, end: shiftCalendarDate(start, 6), sessions: items, emptyWeeks: items.length ? 0 : 1 })
  }
  return result
}

export function historyRange(start: string, end = shiftCalendarDate(start, 6)) {
  const format = (date: string) => new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
  if (start.slice(0, 7) === end.slice(0, 7)) return `${Number(start.slice(8))}–${format(end)}`
  return `${format(start)}–${format(end)}`
}

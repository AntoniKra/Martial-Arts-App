import { isCalendarDate, isMonday, shiftCalendarDate, weekStartForDate } from '@/domain/week-plan/weekCalendar'

export interface HistoryWeek<T> { start: string; end: string; sessions: T[]; emptyWeeks: number }

interface DatedHistoryItem { workoutDate?: string; completedAt: string }

export function historyDate(item: DatedHistoryItem): string {
  return item.workoutDate ?? item.completedAt.slice(0, 10)
}

export function normalizeHistoryWeek(week: string | null): string | null {
  if (week && isMonday(week)) return week
  if (!week || !isCalendarDate(week)) return null
  const monday = weekStartForDate(week)
  return isMonday(monday) ? monday : null
}

export function initialHistoryMonth(today: string, week: string | null): string {
  return `${(week ?? today).slice(0, 7)}-01`
}

export function historyInWeek<T extends DatedHistoryItem>(sessions: readonly T[], week: string | null): readonly T[] {
  if (!week) return sessions
  const end = shiftCalendarDate(week, 6)
  return sessions.filter((session) => historyDate(session) >= week && historyDate(session) <= end)
}

/** Collapse only gaps inside the journal, never invent weeks before the first entry. */
export function groupHistoryWeeks<T extends DatedHistoryItem>(sessions: readonly T[], currentWeek: string, matching: readonly T[] = sessions): HistoryWeek<T>[] {
  const grouped = new Map<string, T[]>()
  for (const session of sessions) grouped.set(weekStartForDate(historyDate(session)), [])
  for (const session of matching) grouped.get(weekStartForDate(historyDate(session)))?.push(session)
  const starts = [...grouped.keys()].sort()
  const first = starts[0]
  if (!first) return []
  const last = starts.at(-1)!
  const result: HistoryWeek<T>[] = []
  for (let start = last > currentWeek ? last : currentWeek; start >= first; start = shiftCalendarDate(start, -7)) {
    const items = grouped.get(start)
    const previous = result.at(-1)
    if (!items && previous?.emptyWeeks) { previous.start = start; previous.emptyWeeks++ }
    else result.push({ start, end: shiftCalendarDate(start, 6), sessions: items ?? [], emptyWeeks: items ? 0 : 1 })
  }
  return result
}

export function historyRange(start: string, end = shiftCalendarDate(start, 6)) {
  const format = (date: string) => new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
  if (start.slice(0, 7) === end.slice(0, 7)) return `${Number(start.slice(8))}–${format(end)}`
  return `${format(start)}–${format(end)}`
}

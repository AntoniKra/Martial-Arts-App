import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'

const dateFormat = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', timeZone: 'UTC' })
const datedDayFormat = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const fullDateFormat = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

export function calendarDate(date: string) {
  return new Date(`${date}T12:00:00Z`)
}

export function historyDayLabel(date: string) {
  return fullDateFormat.format(calendarDate(date))
}

export function historyCalendarDayLabel(date: string) {
  return datedDayFormat.format(calendarDate(date))
}

export function historyWeekTitle(start: string, today: string) {
  const end = shiftCalendarDate(start, 6)
  const year = today.slice(0, 4)
  const withYear = (date: string) => `${dateFormat.format(calendarDate(date))}${date.slice(0, 4) === year ? '' : ` ${date.slice(0, 4)}`}`
  if (start.slice(0, 7) === end.slice(0, 7)) return `${Number(start.slice(8))}–${withYear(end)}`
  if (start.slice(0, 4) === end.slice(0, 4)) return `${dateFormat.format(calendarDate(start))}–${withYear(end)}`
  return `${withYear(start)}–${withYear(end)}`
}

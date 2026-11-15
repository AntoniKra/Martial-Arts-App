import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { calculateScheduledWeek, scheduledItemDate } from './scheduledWeek'
import { shiftCalendarDate } from './weekCalendar'
import type { WeekPlan } from './weekPlan.types'

export function selectHomeSchedule(current: WeekPlan, weeks: readonly WeekPlan[], sessions: readonly WorkoutSession[], today: string) {
  const progress = calculateScheduledWeek(current, sessions, today)
  const dated = weeks.flatMap((plan) => calculateScheduledWeek(plan, sessions, today).matches
    .map((match) => ({ ...match, weekStart: plan.weekStart, date: scheduledItemDate(plan.weekStart, match.item.day) })))
  const todayClubs = progress.matches.filter((match) => match.item.kind === 'club' && !match.item.omitted
    && scheduledItemDate(current.weekStart, match.item.day) === today)
    .sort((a, b) => (a.item.kind === 'club' ? a.item.startTime : '').localeCompare(b.item.kind === 'club' ? b.item.startTime : ''))
  const next = dated.filter((match) => match.date !== null && match.date > today && match.item.kind !== 'rest'
    && !match.item.omitted && !match.session)
    .sort((a, b) => a.date!.localeCompare(b.date!) ||
      (a.item.kind === 'club' ? a.item.startTime : '').localeCompare(b.item.kind === 'club' ? b.item.startTime : ''))[0] ?? null
  const overdue = dated.filter((match) => match.item.kind === 'club' && match.date !== null
    && match.date >= shiftCalendarDate(today, -7) && match.date < today && match.status === 'missed')
    .sort((a, b) => b.date!.localeCompare(a.date!) || a.item.id.localeCompare(b.item.id))
  const flexible = progress.matches.filter((match) => match.item.kind === 'own' && match.item.day === null && match.status === 'planned')
  const days = Array.from({ length: 7 }, (_, day) => {
    const date = shiftCalendarDate(current.weekStart, day)
    const matches = progress.matches.filter((match) => match.item.day === day)
    const done = sessions.some((session) => session.workoutDate === date)
    const planned = matches.some((match) => match.status === 'planned' || match.status === 'missed')
    const rest = matches.some((match) => match.status === 'rest')
    const omitted = matches.some((match) => match.status === 'omitted')
    return { date, done, planned, rest, omitted, today: date === today,
      symbol: `${done ? '✓' : ''}${planned ? '○' : ''}` || (rest || omitted ? '–' : '·') }
  })
  return { kind: todayClubs.length ? 'club' as const : current.schedule?.length || current.items.length ? 'rest' as const : 'noPlan' as const,
    todayClubs, next, overdue, flexible, days }
}

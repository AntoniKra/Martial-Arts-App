import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import type { WorkoutSession, WorkoutSessionCategory } from '@/domain/workout-session/workoutSession.types'

/** Journal dates are authoritative, independently of source, status and UTC timestamps. */
export function calculateProfileStatistics(sessions: readonly WorkoutSession[], today: string) {
  const start = shiftCalendarDate(today, -27)
  const byCategory = new Map<WorkoutSessionCategory, number>()
  let knownRounds = 0
  let knownRoundEntries = 0
  let unknownRoundWorkouts = 0
  for (const session of sessions) {
    if (session.sparring.some((entry) => entry.rounds === null)) unknownRoundWorkouts++
    for (const entry of session.sparring) {
      if (entry.rounds !== null) { knownRounds += entry.rounds; knownRoundEntries++ }
    }
    if (session.workoutDate >= start && session.workoutDate <= today) {
      byCategory.set(session.category, (byCategory.get(session.category) ?? 0) + session.durationSeconds)
    }
  }
  const categories = [...byCategory].map(([category, durationSeconds]) => ({ category, durationSeconds }))
    .filter((entry) => entry.durationSeconds > 0)
    .sort((a, b) => b.durationSeconds - a.durationSeconds || a.category.localeCompare(b.category))
  return {
    firstDate: sessions.length ? sessions.reduce((date, entry) => entry.workoutDate < date ? entry.workoutDate : date, sessions[0].workoutDate) : null,
    workoutCount: sessions.length,
    durationSeconds: sessions.reduce((sum, entry) => sum + entry.durationSeconds, 0),
    sparringRounds: knownRoundEntries || !unknownRoundWorkouts ? knownRounds : null,
    unknownRoundWorkouts, start, end: today, categories,
    recentDurationSeconds: categories.reduce((sum, entry) => sum + entry.durationSeconds, 0),
  }
}

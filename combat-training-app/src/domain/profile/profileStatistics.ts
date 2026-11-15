import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import type { WorkoutSession, WorkoutSessionCategory } from '@/domain/workout-session/workoutSession.types'
import { MANUAL_WORKOUT_PARTS, type ManualWorkoutPart } from '@/domain/workout-session/workoutSession.types'
import { manualSessionParts } from '@/domain/workout-session/manualWorkoutParts'

/** Journal dates are authoritative, independently of source, status and UTC timestamps. */
export function calculateProfileStatistics(sessions: readonly WorkoutSession[], today: string) {
  const start = shiftCalendarDate(today, -27)
  const byCategory = new Map<WorkoutSessionCategory | 'other', number>()
  const byPart = new Map<ManualWorkoutPart, number>()
  let recentDurationSeconds = 0
  let knownRounds = 0
  let knownRoundEntries = 0
  let unknownRoundWorkouts = 0
  for (const session of sessions) {
    if (session.sparring.some((entry) => entry.rounds === null)) unknownRoundWorkouts++
    for (const entry of session.sparring) {
      if (entry.rounds !== null) { knownRounds += entry.rounds; knownRoundEntries++ }
    }
    if (session.workoutDate >= start && session.workoutDate <= today) {
      recentDurationSeconds += session.durationSeconds
      if (session.source === 'manual') {
        const parts = manualSessionParts(session)
        for (const part of parts) byPart.set(part, (byPart.get(part) ?? 0) + 1)
        if (parts.length === 1 && (session.category !== 'mixed' || session.parts?.length === 1)) {
          const category = parts[0]
          byCategory.set(category, (byCategory.get(category) ?? 0) + session.durationSeconds)
        }
      } else byCategory.set(session.category, (byCategory.get(session.category) ?? 0) + session.durationSeconds)
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
    recentDurationSeconds,
    partCounts: MANUAL_WORKOUT_PARTS.filter((part) => byPart.has(part)).map((part) => ({ part, count: byPart.get(part)! })),
  }
}

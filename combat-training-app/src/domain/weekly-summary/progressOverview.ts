import { median, type FocusSkillAssessment } from '@/domain/focus-skill/focusSkillProgress'
import { shiftCalendarDate, weekStartForDate } from '@/domain/week-plan/weekCalendar'
import { scheduledWeekFromLegacy } from '@/domain/week-plan/updateRecurringWeek'
import type { WeekPlan } from '@/domain/week-plan/weekPlan.types'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { calculateWeeklySummary } from '@/domain/weekly-summary/weeklySummary'

export function progressWeeks(sessions: readonly Pick<WorkoutSession, 'workoutDate'>[], currentWeek: string, limit = 12): string[] {
  const first = sessions.map((session) => weekStartForDate(session.workoutDate)).sort()[0]
  if (!first || first > currentWeek) return []
  const weeks: string[] = []
  for (let week = currentWeek; week >= first && weeks.length < limit; week = shiftCalendarDate(week, -7)) weeks.unshift(week)
  return weeks
}

/** Four complete calendar weeks, including empty weeks; never include the running week. */
export function typicalProgress(sessions: readonly WorkoutSession[], currentWeek: string) {
  const start = shiftCalendarDate(currentWeek, -28)
  const first = sessions.map((session) => session.workoutDate).sort()[0]
  if (!first || first > start) return null
  const summaries = Array.from({ length: 4 }, (_, index) => calculateWeeklySummary(shiftCalendarDate(start, index * 7), sessions))
  return { minutes: median(summaries.map((summary) => Math.ceil(summary.durationSeconds / 60)))!,
    load: summaries.every((summary) => summary.rpeCount === summary.workoutCount)
      ? median(summaries.map((summary) => summary.load.units ?? 0)) : null }
}

export function weekTarget(plan: WeekPlan | undefined): number | null {
  const count = plan ? scheduledWeekFromLegacy(plan).targetCount : undefined
  return count ? count : null
}

export function focusCardSummary(assessments: readonly FocusSkillAssessment[]) {
  const ratings = assessments.filter((rating) => rating.currentCriterion && typeof rating.assessment === 'number')
  const latest = ratings.at(-1)
  const previous = ratings.at(-2)
  const value = latest ? Number(latest.assessment) : null
  const before = previous ? Number(previous.assessment) : null
  return { value, recent: ratings.slice(-3).map((rating) => Number(rating.assessment)),
    trend: value === null || before === null ? null : value === before ? 'bez zmian' : `${value > before ? '↑' : '↓'} z ${before}` }
}

export function sparringOverview(sessions: readonly WorkoutSession[], start: string, end: string) {
  const entries = sessions.filter((session) => session.workoutDate >= start && session.workoutDate <= end)
    .filter((session) => session.sparring.some((entry) => entry.rounds === null || entry.rounds > 0))
  return { workouts: entries.length, rounds: entries.reduce((sum, session) => sum + session.sparring.reduce((total, entry) => total + (entry.rounds ?? 0), 0), 0),
    unknown: entries.filter((session) => session.sparring.some((entry) => entry.rounds === null)).length }
}

export function latestCorrection(sessions: readonly WorkoutSession[]) {
  return [...sessions].sort((a, b) => b.workoutDate.localeCompare(a.workoutDate) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
    .flatMap((session) => session.source === 'quickTimer' ? [] : session.focusRatings.flatMap((rating) => rating.correction
      ? [{ ...rating.correction, workoutDate: session.workoutDate, sessionId: session.id, source: session.source }] : []))[0] ?? null
}

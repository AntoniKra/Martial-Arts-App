import { useEffect, useRef, useState } from 'react'
import { useWorkoutData } from '@/application/workoutDataContext'
import { selectWeekPlan } from '@/application/week-plan/selectWeekPlan'
import { generateScheduledWeek } from '@/domain/week-plan/scheduledWeek'
import { selectHomeSchedule } from '@/domain/week-plan/homeSchedule'
import { shiftCalendarDate, weekStartForDate } from '@/domain/week-plan/weekCalendar'

export function useHomeSchedule(today: string) {
  const { weekPlans, recurringWeeks, sessions, weekPlanRepository } = useWorkoutData()
  const currentWeek = weekStartForDate(today)
  const selected = selectWeekPlan(weekPlans, currentWeek)
  const [openedAt] = useState(() => new Date())
  const [generationError, setGenerationError] = useState(false)
  const generation = useRef<string | null>(null)
  const recurring = recurringWeeks.items[0]
  const recurringReady = recurringWeeks.status === 'ready' && !recurringWeeks.invalidDocumentIds.length && (!!recurring || recurringWeeks.complete)
  const ready = selected.status === 'ready' && (!!selected.plan || recurringReady)
  const plan = selected.status === 'ready' && selected.plan ? selected.plan : generateScheduledWeek(currentWeek, recurring, openedAt)
  const sessionsReady = sessions.status === 'ready' && sessions.complete && !sessions.invalidDocumentIds.length

  useEffect(() => {
    if (!ready || selected.status !== 'ready' || selected.plan || !recurring || generation.current === currentWeek) return
    generation.current = currentWeek
    void weekPlanRepository.save(generateScheduledWeek(currentWeek, recurring, openedAt)).catch(() => setGenerationError(true))
  }, [ready, selected, recurring, currentWeek, openedAt, weekPlanRepository])

  const nextWeek = shiftCalendarDate(currentWeek, 7)
  const weeks = [...weekPlans.items.filter((week) => week.weekStart !== currentWeek), plan]
  // Preview the next recurring week without creating a historical or future snapshot.
  if (weekPlans.complete && recurringReady && !weeks.some((week) => week.weekStart === nextWeek)) weeks.push(generateScheduledWeek(nextWeek, recurring, openedAt))
  return { plan, ready, sessionsReady, generationError,
    retryGeneration: () => { generation.current = null; setGenerationError(false) },
    schedule: ready && sessionsReady ? selectHomeSchedule(plan, weeks, sessions.items, today) : null }
}

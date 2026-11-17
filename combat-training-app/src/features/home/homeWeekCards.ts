import type { selectHomeSchedule } from '@/domain/week-plan/homeSchedule'

export function selectHomeWeekCards(schedule: ReturnType<typeof selectHomeSchedule>, weekStart: string) {
  return { next: schedule.next?.weekStart === weekStart ? schedule.next : null, flexible: schedule.flexible }
}

import type { WeekPlanCollectionState } from './useWeekPlanCollection'
import { isMonday } from '@/domain/week-plan/weekCalendar'

export function selectWeekPlan(state: WeekPlanCollectionState, weekStart: string) {
  if (!isMonday(weekStart) || weekStart < state.rangeStart) return { status: 'outsideRange' as const }
  if (state.status === 'loading') return { status: 'loading' as const }
  if (state.status === 'error' || state.invalidDocumentIds.includes(weekStart)) return { status: 'error' as const }
  const plan = state.items.find((item) => item.weekStart === weekStart)
  if (!plan && !state.complete) return { status: 'incomplete' as const }
  return { status: 'ready' as const, plan }
}

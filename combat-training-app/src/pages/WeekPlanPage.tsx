import { RouteScreenHeader } from '@/components/ScreenHeader'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { routes } from '@/app/routes'
import { useWorkoutData } from '@/application/workoutDataContext'
import { selectWeekPlan } from '@/application/week-plan/selectWeekPlan'
import { isMonday } from '@/domain/week-plan/weekCalendar'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { WeekPlanDataMessage } from '@/features/week-plan/WeekPlanSummary'
import { weekPlanLabels as labels } from '@/features/week-plan/weekPlanLabels'
import { ScheduledWeekView } from '@/features/week-plan/ScheduledWeekView'
import { RecurringWeekEditor } from '@/features/week-plan/RecurringWeekEditor'

export function Component() {
  const { currentWeek, weekPlans } = useWorkoutData()
  const [recurringEditing, setRecurringEditing] = useState(false)
  const { weekStart = '' } = useParams()
  const selected = selectWeekPlan(weekPlans, weekStart)
  if (recurringEditing) return <div className="px-4 pb-6 pt-4 md:px-0"><RecurringWeekEditor onClose={() => setRecurringEditing(false)} /></div>
  if (!isMonday(weekStart) || selected.status === 'outsideRange') return <div className="space-y-4 px-4 py-6 md:px-0">
    <RouteScreenHeader title={labels.title} fallback={routes.progress} /><WeekPlanDataMessage status="outsideRange" />
    <Link to={routes.weekPlan(currentWeek)} className={getButtonClassName()}>{labels.current}</Link>
  </div>
  return <ScheduledWeekView key={weekStart} weekStart={weekStart} onRecurring={() => setRecurringEditing(true)} />
}

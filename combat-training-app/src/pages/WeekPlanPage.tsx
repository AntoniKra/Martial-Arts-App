import { ScreenHeader } from '@/components/ScreenHeader'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { planListTab, routes } from '@/app/routes'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useWorkoutData } from '@/application/workoutDataContext'
import { selectWeekPlan } from '@/application/week-plan/selectWeekPlan'
import { isMonday } from '@/domain/week-plan/weekCalendar'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { WeekPlanDataMessage } from '@/features/week-plan/WeekPlanSummary'
import { weekPlanLabels as labels } from '@/features/week-plan/weekPlanLabels'
import { ScheduledWeekView } from '@/features/week-plan/ScheduledWeekView'
import { RecurringWeekEditor } from '@/features/week-plan/RecurringWeekEditor'
import { WorkoutShortcutLink } from '@/features/home/components/WorkoutShortcutLink'
import { WorkoutListContent } from '@/features/workouts/WorkoutListContent'

const segments = [
  { value: 'week', label: labels.weekSegment },
  { value: planListTab, label: labels.plansSegment },
] as const

export function Component() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const segment = params.get('tab') === planListTab ? planListTab : 'week'
  const { currentWeek, weekPlans } = useWorkoutData()
  const [recurringEditing, setRecurringEditing] = useState(false)
  const { weekStart = currentWeek } = useParams()
  const selected = selectWeekPlan(weekPlans, weekStart)
  if (recurringEditing && segment === 'week') return <div className="px-4 pb-6 pt-4 md:px-0"><RecurringWeekEditor onClose={() => setRecurringEditing(false)} /></div>

  return <div className="flex flex-col gap-3 px-4 pt-3 pb-5 md:px-0 md:pt-0">
    <ScreenHeader variant="main" title={labels.heading} />
    <SegmentedControl ariaLabel={labels.title} options={segments} value={segment} className="plan-segments"
      onChange={(next) => {
        if (next !== segment) void navigate(next === planListTab ? routes.workouts : routes.plan, { flushSync: true })
      }} />
    {segment === planListTab ? <>
      <WorkoutShortcutLink kind="exercises" />
      <WorkoutListContent />
    </> : !isMonday(weekStart) || selected.status === 'outsideRange' ? <>
      <WeekPlanDataMessage status="outsideRange" />
      <div><Link to={routes.weekPlan(currentWeek)} className={getButtonClassName()}>{labels.current}</Link></div>
    </> : <ScheduledWeekView key={weekStart} weekStart={weekStart} onRecurring={() => setRecurringEditing(true)} />}
  </div>
}

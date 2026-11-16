import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { WeekDayIndicator } from '@/components/domain/WeekDayIndicator'
import { weekDayState } from '@/components/domain/weekDayPresentation'
import type { selectHomeSchedule } from '@/domain/week-plan/homeSchedule'
import type { calculateWeekPlanProgress } from '@/domain/week-plan/weekPlanProgress'
import { activityTitle, weekdays } from '@/features/week-plan/scheduleLabels'
import { homeLabels as labels, homeWeekLabel } from '../homeLabels'
import { homeInlineLink } from './HomeScheduleCards'

export function HomeWeekCard({ weekStart, schedule, progress, minutes, today }: {
  weekStart: string; schedule: ReturnType<typeof selectHomeSchedule>; progress: ReturnType<typeof calculateWeekPlanProgress>; minutes: number; today: string
}) {
  return <section aria-label={labels.week} className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-x-2">
      <h2 className="font-display text-lg font-extrabold">{labels.week}<span className="sr-only"> · {homeWeekLabel(weekStart)}</span></h2>
      <Link to={routes.weekPlan(weekStart)} className={homeInlineLink}>{labels.weekPlan} ›</Link>
    </div>
    <ol aria-label={labels.days} className="grid list-none grid-cols-7 gap-1.5 text-center">
      {schedule.days.map((day, index) => {
        return <li key={day.date}>
          <WeekDayIndicator name={weekdays[index].name} short={weekdays[index].short} today={day.today}
            state={weekDayState({ done: day.done, planned: day.planned, missed: day.omitted || day.planned && day.date < today })} />
        </li>
      })}
    </ol>
    <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted">
      <p className="tabular-nums">{progress.hasGoal ? labels.goal(progress.goalCount, progress.total) : labels.workouts(progress.workoutCount)}{' '}{progress.hasGoal ? 'treningów · ' : '· '}{minutes} min</p>
      {schedule.next && <p>jeszcze: {schedule.next.date && `${new Intl.DateTimeFormat('pl-PL', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${schedule.next.date}T12:00:00Z`))}, `}{activityTitle(schedule.next.item)}</p>}
    </div>
    {progress.hasGoal && <div role="progressbar" aria-label={labels.week} aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.completed}
      aria-valuetext={labels.goal(progress.goalCount, progress.total)} className="h-1.5 overflow-hidden rounded-[3px] bg-bd"><div className="accent-fill h-full" style={{ width: `${progress.percentage}%` }} /></div>}
    {!!schedule.flexible.length && <p className="text-xs text-muted">{labels.flexible(schedule.flexible.length)}</p>}
    {!progress.hasGoal && <p className="text-sm text-muted"><span>{labels.noGoal}</span> <Link to={routes.weekPlan(weekStart)} className={homeInlineLink}>{labels.setGoal}</Link></p>}
    <div className="flex items-center gap-3 rounded-sm border border-bd bg-surface px-3.5 py-1">
      <span aria-hidden="true" className="accent-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="13" r="8" /><path d="M12 9v4M9 2h6" /></svg></span>
      <Link to={routes.quickTimer} className="inline-flex min-h-touch min-w-touch items-center text-sm font-bold">{labels.timer}</Link>
      <Link to={routes.workouts} className="flex min-h-touch flex-1 items-center justify-between text-sm font-bold">{labels.otherPlansSuffix}<span aria-hidden="true">›</span></Link>
    </div>
  </section>
}

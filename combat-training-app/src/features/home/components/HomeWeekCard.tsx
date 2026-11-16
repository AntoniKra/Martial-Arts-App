import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import type { selectHomeSchedule } from '@/domain/week-plan/homeSchedule'
import type { calculateWeekPlanProgress } from '@/domain/week-plan/weekPlanProgress'
import { weekdays } from '@/features/week-plan/scheduleLabels'
import { homeLabels as labels, homeWeekLabel } from '../homeLabels'
import { homeInlineLink, homeSectionLabel } from './HomeScheduleCards'

export function HomeWeekCard({ weekStart, schedule, progress, minutes }: {
  weekStart: string; schedule: ReturnType<typeof selectHomeSchedule>; progress: ReturnType<typeof calculateWeekPlanProgress>; minutes: number
}) {
  return <section aria-label={labels.week} className="flex flex-col gap-3 border border-bd bg-surface p-4">
    <div className="flex flex-wrap items-center justify-between gap-x-2">
      <h2 className={homeSectionLabel}>{labels.week} · {homeWeekLabel(weekStart)}</h2>
      <Link to={routes.weekPlan(weekStart)} className={homeInlineLink}>{labels.weekPlan} ›</Link>
    </div>
    <p className="font-display text-[22px] font-bold leading-tight tabular-nums">
      {progress.hasGoal ? labels.goal(progress.goalCount, progress.total) : labels.workouts(progress.workoutCount)}{' '}
      <span className="font-sans text-sm font-medium text-muted">{progress.hasGoal ? 'treningów · ' : '· '}{minutes} min</span>
    </p>
    {progress.hasGoal && <div role="progressbar" aria-label={labels.week} aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.completed}
      aria-valuetext={labels.goal(progress.goalCount, progress.total)} className="sr-only" />}
    <ol aria-label={labels.days} className="grid list-none grid-cols-7 gap-1.5 text-center">
      {schedule.days.map((day, index) => {
        const statuses = [day.done && labels.dayStatuses.done, day.planned && labels.dayStatuses.planned,
          day.rest && labels.dayStatuses.rest, day.omitted && labels.dayStatuses.omitted,
          !day.done && !day.planned && !day.rest && !day.omitted && labels.dayStatuses.free, day.today && labels.dayStatuses.today].filter(Boolean).join(', ')
        return <li key={day.date} className={`flex flex-col gap-1 text-[11px] ${day.today ? 'font-bold text-ink' : 'text-muted'}`}>
          <span role="img" aria-label={`${weekdays[index].name}: ${statuses}`} className={`flex h-[30px] items-center justify-center ${day.today ? 'border-2 border-ink' : day.planned ? 'border border-bd' : ''} ${day.done ? 'bg-crimson font-bold text-on-accent' : ''}`}>{day.symbol}</span>
          {weekdays[index].short}
        </li>
      })}
    </ol>
    <p className="text-xs text-faint">{labels.legend}{schedule.flexible.length ? ` · ${labels.flexible(schedule.flexible.length)}` : ''}</p>
    {!progress.hasGoal && <p className="text-sm text-muted"><span>{labels.noGoal}</span> <Link to={routes.weekPlan(weekStart)} className={homeInlineLink}>{labels.setGoal}</Link></p>}
  </section>
}

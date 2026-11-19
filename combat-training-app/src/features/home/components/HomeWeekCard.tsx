import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { WeekDayIndicator } from '@/components/domain/WeekDayIndicator'
import { weekDayState } from '@/components/domain/weekDayPresentation'
import type { selectHomeSchedule } from '@/domain/week-plan/homeSchedule'
import type { calculateWeekPlanProgress } from '@/domain/week-plan/weekPlanProgress'
import { activityDetail, activityTitle, weekdays } from '@/features/week-plan/scheduleLabels'
import { selectHomeWeekCards } from '../homeWeekCards'
import { homeLabels as labels, homeWeekLabel } from '../homeLabels'
import { homeInlineLink } from './HomeScheduleCards'
import { HomeActionIcon } from './HomeActionIcon'

export function HomeWeekStats({ completed, total, percentage }: { completed: number; total: number; percentage: number }) {
  return <div className="home-week-stats">
    <p>{labels.completed} <b>{labels.goal(completed, total)}</b> {labels.units(total).replace(`${total} `, '')}</p>
    <p>{labels.progress} <b>{percentage}%</b></p>
  </div>
}

export function HomeWeekCard({ weekStart, schedule, progress, today }: {
  weekStart: string; schedule: ReturnType<typeof selectHomeSchedule>; progress: ReturnType<typeof calculateWeekPlanProgress>; today: string
}) {
  const cards = selectHomeWeekCards(schedule, weekStart)
  const dayPath = (date: string | null) => `${routes.weekPlan(weekStart)}${date ? `?day=${date}#day-${date}` : '#flexible-workouts'}`
  return <section aria-label={labels.week} className="flex flex-col gap-2.5">
    <div className="home-week-tracker">
      <div className="flex flex-wrap items-center justify-between gap-x-2">
        <h2 className="font-display text-base font-extrabold text-ink">{labels.week}<span className="sr-only"> · {homeWeekLabel(weekStart)}</span></h2>
        <Link to={routes.weekPlan(weekStart)} className={`${homeInlineLink} font-semibold`}>{labels.weekPlan} →</Link>
      </div>
      <ol aria-label={labels.days} className="grid list-none grid-cols-7 gap-1 text-center">
        {schedule.days.map((day, index) => <li key={day.date}>
          <WeekDayIndicator variant="home" name={weekdays[index].name} short={index === 5 ? 'So' : weekdays[index].short} today={day.today}
            state={weekDayState({ done: day.done, planned: day.planned, missed: day.omitted || day.planned && day.date < today })} />
        </li>)}
      </ol>
      {progress.hasGoal ? <>
        <div role="progressbar" aria-label={labels.week} aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.completed}
          aria-valuetext={labels.goal(progress.goalCount, progress.total)} className="h-1.5 overflow-hidden rounded-[3px] bg-bd"><div className="accent-fill h-full rounded-[3px]" style={{ width: `${progress.percentage}%` }} /></div>
        <HomeWeekStats completed={progress.goalCount} total={progress.total} percentage={progress.percentage ?? 0} />
      </> : <div className="week-no-goal-row">
        <Link to={routes.weekPlan(weekStart)} className="no-goal-link">{labels.setGoal}<HomeActionIcon kind="arrow" className="size-4 shrink-0" strokeWidth={2} /></Link>
      </div>}
    </div>
    {cards.next && <Link to={dayPath(cards.next.date)} className="home-next-workout">
      <span className="home-next-date" aria-hidden="true"><span>{new Intl.DateTimeFormat('pl-PL', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${cards.next.date}T12:00:00Z`)).replace('.', '').toLocaleUpperCase('pl')}</span><b>{Number(cards.next.date?.slice(8))}</b></span>
      <span className="min-w-0 flex-1"><span className="sr-only">{cards.next.date && new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${cards.next.date}T12:00:00Z`))} · </span><span className="block break-words text-sm font-bold">{labels.next}: {activityTitle(cards.next.item)}</span><span className="block truncate text-xs text-muted">{activityDetail(cards.next.item)}</span></span>
      <span aria-hidden="true" className="text-muted">›</span>
    </Link>}
    {cards.flexible.length > 0 && <section aria-label={labels.flexible} className="space-y-2.5">
      {cards.flexible.map(({ item }) => <Link key={item.id} to={dayPath(null)} className="home-flexible-workout">
        <span className="min-w-0 break-words">+ {labels.flexibleAction}: {activityTitle(item)}</span><span aria-hidden="true">›</span>
      </Link>)}
    </section>}
    <Link to={routes.workouts} className="home-other-plans">
      <span aria-hidden="true" className="home-other-icon"><HomeActionIcon kind="timer" /></span>
      <span className="min-w-0 flex-1"><span className="block font-display text-sm font-bold">{labels.otherPlans}</span><span className="block text-[11px] text-muted">{labels.otherPlansHint}</span></span><span aria-hidden="true" className="text-muted">›</span>
    </Link>
  </section>
}

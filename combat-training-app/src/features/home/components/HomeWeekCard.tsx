import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { WeekDayIndicator } from '@/components/domain/WeekDayIndicator'
import { weekDayState } from '@/components/domain/weekDayPresentation'
import type { selectHomeSchedule } from '@/domain/week-plan/homeSchedule'
import type { calculateWeekPlanProgress } from '@/domain/week-plan/weekPlanProgress'
import { activityDetail, activityTitle, scheduleLabels, weekdays } from '@/features/week-plan/scheduleLabels'
import { selectHomeWeekCards } from '../homeWeekCards'
import { homeLabels as labels, homeWeekLabel } from '../homeLabels'
import { homeInlineLink } from './HomeScheduleCards'

export function HomeWeekCard({ weekStart, schedule, progress, minutes, today }: {
  weekStart: string; schedule: ReturnType<typeof selectHomeSchedule>; progress: ReturnType<typeof calculateWeekPlanProgress>; minutes: number; today: string
}) {
  const cards = selectHomeWeekCards(schedule, weekStart)
  const cardClass = 'grid min-h-touch grid-cols-[48px_1fr_20px] items-center gap-3 rounded-sm border border-bd bg-surface px-3 py-2.5 text-left'
  const dateClass = 'flex size-12 flex-col items-center justify-center gap-1 rounded-sm bg-elevated leading-none'
  const dayPath = (date: string | null) => `${routes.weekPlan(weekStart)}${date ? `?day=${date}#day-${date}` : '#flexible-workouts'}`
  return <section aria-label={labels.week} className="flex flex-col gap-3">
    <div className="home-week-tracker">
    <div className="flex flex-wrap items-center justify-between gap-x-2">
      <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{labels.week}<span className="sr-only"> · {homeWeekLabel(weekStart)}</span></h2>
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
      {progress.hasGoal && <p>{scheduleLabels.remaining(Math.max(0, progress.total - progress.goalCount))}</p>}
    </div>
    {progress.hasGoal && <div role="progressbar" aria-label={labels.week} aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.completed}
      aria-valuetext={labels.goal(progress.goalCount, progress.total)} className="h-1.5 overflow-hidden rounded-[3px] bg-bd"><div className="accent-fill h-full" style={{ width: `${progress.percentage}%` }} /></div>}
    </div>
    {cards.next && <div className="space-y-2">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{labels.next}</h3>
      <Link to={dayPath(cards.next.date)} className={cardClass}>
        <span className={dateClass} aria-hidden="true"><span className="text-[10px] font-extrabold uppercase tracking-wider text-crimson-ink">{new Intl.DateTimeFormat('pl-PL', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${cards.next.date}T12:00:00Z`)).replace('.', '')}</span><b className="font-display text-xl font-extrabold">{Number(cards.next.date?.slice(8))}</b></span>
        <span className="min-w-0"><span className="sr-only">{cards.next.date && new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${cards.next.date}T12:00:00Z`))} · </span><span className="block break-words text-[15px] font-bold">{activityTitle(cards.next.item)}</span><span className="block break-words text-[13px] text-muted">{activityDetail(cards.next.item)}</span></span>
        <span aria-hidden="true" className="text-muted">›</span>
      </Link>
    </div>}
    {cards.flexible.length > 0 && <section aria-label={labels.flexible} className="space-y-2">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{labels.flexible}</h3>
      {cards.flexible.map(({ item }) => <Link key={item.id} to={dayPath(null)} className={`${cardClass} home-flexible-workout border-dashed`}>
        <span className={`${dateClass} text-ember-ink`} aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="1" /><path d="M3 10h18M8 3v4M16 3v4" /></svg></span>
        <span className="min-w-0"><span className="block break-words text-[15px] font-bold">{activityTitle(item)}</span><span className="block break-words text-[13px] text-muted">{activityDetail(item)}</span></span><span aria-hidden="true" className="text-muted">›</span>
      </Link>)}
    </section>}
    {!progress.hasGoal && <p className="text-sm text-muted"><span>{labels.noGoal}</span> <Link to={routes.weekPlan(weekStart)} className={homeInlineLink}>{labels.setGoal}</Link></p>}
    <div className="flex items-center gap-3 rounded-sm border border-bd bg-surface px-3.5 py-1">
      <span aria-hidden="true" className="accent-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="13" r="8" /><path d="M12 9v4M9 2h6" /></svg></span>
      <Link to={routes.quickTimer} className="inline-flex min-h-touch min-w-touch items-center text-sm font-bold">{labels.timer}</Link>
      <Link to={routes.workouts} className="flex min-h-touch flex-1 items-center justify-between text-sm font-bold">{labels.otherPlansSuffix}<span aria-hidden="true">›</span></Link>
    </div>
  </section>
}

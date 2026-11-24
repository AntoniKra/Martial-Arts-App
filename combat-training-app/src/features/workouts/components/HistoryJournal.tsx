import { useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { routes } from '@/app/routes'
import { useWorkoutData } from '@/application/workoutDataContext'
import { selectWeekPlan } from '@/application/week-plan/selectWeekPlan'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { calculateScheduledWeek } from '@/domain/week-plan/scheduledWeek'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import { calculateWeeklySummary } from '@/domain/weekly-summary/weeklySummary'
import { workoutCountNoun } from '@/domain/workout/workoutCountLabels'
import { profileDataUnavailable } from '@/features/profile/profileDataUnavailable'
import { useProfileToday } from '@/features/profile/useProfileToday'
import { historyLabels as labels } from '../historyLabels'
import type { WorkoutHistoryListItem, WorkoutHistoryMutationResult, WorkoutsSortOrder } from '../types/workoutsView.types'
import { calendarDate, historyCalendarDayLabel, historyDayLabel, historyWeekTitle } from '../utils/historyPresentation'
import { groupHistoryWeeks, historyDate, historyInWeek, historyRange, initialHistoryMonth } from '../utils/historyWeeks'
import { HistoryIcon } from './HistoryIcon'
import { WorkoutHistoryCard } from './WorkoutHistoryCard'
import './history.css'

const views = [
  { label: labels.weeks, value: 'weeks', icon: <HistoryIcon name="list" /> },
  { label: labels.month, value: 'month', icon: <HistoryIcon name="calendar" /> },
] as const

const monthFormat = new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric', timeZone: 'UTC' })

interface HistoryJournalProps {
  week: string | null
  history: readonly WorkoutHistoryListItem[]
  matching: readonly WorkoutHistoryListItem[]
  contentFiltered: boolean
  sortOrder: WorkoutsSortOrder
  onUpdateNote: (id: string, note: string) => Promise<WorkoutHistoryMutationResult>
  onDelete: (id: string) => Promise<WorkoutHistoryMutationResult>
}

export function HistoryJournal({ week, history, matching, contentFiltered, sortOrder, onUpdateNote, onDelete }: HistoryJournalProps) {
  const { currentWeek, sessions, weekPlans } = useWorkoutData()
  const incomplete = Boolean(profileDataUnavailable(sessions))
  const today = useProfileToday()
  const [params, setParams] = useSearchParams()
  const headingPrefix = useId()
  const [mode, setMode] = useState<'weeks' | 'month'>('weeks')
  const [calendar, setCalendar] = useState<{ week: string | null; month: string | null; day: string | null }>({ week, month: null, day: null })
  if (calendar.week !== week) setCalendar({ week, month: null, day: null })
  const month = calendar.month ?? initialHistoryMonth(today, week)
  const { day } = calendar
  const allEntries = historyInWeek(history, week)
  const selected = historyInWeek(matching, week)

  function card(item: WorkoutHistoryListItem) {
    return <WorkoutHistoryCard key={item.id} session={item} onUpdateNote={onUpdateNote} onDelete={onDelete} />
  }

  function clearWeek() {
    const next = new URLSearchParams(params)
    next.delete('week')
    setParams(next)
  }

  function renderWeeks() {
    const groups = groupHistoryWeeks(allEntries, week ?? currentWeek, selected)
    if (sortOrder === 'oldest') groups.reverse()
    if (!groups.length) {
      if (incomplete || week) return <p className="p-3 text-sm text-muted">{incomplete ? labels.incomplete : labels.emptyWeek}</p>
      return <div className="history-empty">
        <span className="history-empty-icon"><HistoryIcon name="calendar" size={28} /></span>
        <h3 className="font-display text-[17px] leading-tight font-extrabold">{labels.emptyTitle}</h3>
        <p className="max-w-[260px] text-[13px] leading-[1.45] text-muted">{labels.emptyDescription}</p>
        <Link to={routes.newManualWorkout} state={{ returnTo: routes.progressHistory }} className="history-empty-action motion-press">
          <HistoryIcon name="plus" />{labels.addFirst}
        </Link>
      </div>
    }
    return groups.map((group) => {
      if (group.emptyWeeks) {
        return incomplete ? null : <p key={group.start} className="history-gap">
          <span>{historyRange(group.start, group.end)} · {labels.gap(group.emptyWeeks)}</span>
        </p>
      }
      const summary = calculateWeeklySummary(group.start, sessions.items)
      const selectedPlan = selectWeekPlan(weekPlans, group.start)
      const plan = !incomplete && selectedPlan.status === 'ready' && selectedPlan.plan
        ? calculateScheduledWeek(selectedPlan.plan, sessions.items, today) : null
      const isCurrentWeek = group.start === currentWeek
      const headingId = `${headingPrefix}-${group.start}`
      return <section key={group.start} aria-labelledby={headingId} className="history-week">
        <header className="history-week-header">
          <div className="flex items-center justify-between gap-2">
            <h3 id={headingId} className="font-display text-sm leading-tight font-extrabold">{isCurrentWeek ? `${labels.currentWeek} · ` : ''}{historyWeekTitle(group.start, today)}</h3>
            {isCurrentWeek && <span className="history-active">{labels.active}</span>}
          </div>
          {contentFiltered && <p className="text-xs text-muted">{labels.fullWeek}</p>}
          {incomplete ? <p className="text-xs text-muted">{labels.incomplete}</p> : <dl className="history-week-stats">
            <div><dt>{workoutCountNoun(summary.workoutCount)}</dt><dd>{summary.workoutCount}</dd></div>
            <div><dt>{labels.totalTime}</dt><dd>{Math.ceil(summary.durationSeconds / 60)} min</dd></div>
            {plan?.percentage != null && <div><dt>{labels.plan(plan.percentage)}</dt><dd>{plan.goalCount} z {plan.targetCount}</dd></div>}
          </dl>}
        </header>
        {group.sessions.length ? group.sessions.map(card) : <p className="p-3 text-sm text-muted">{labels.noMatching}</p>}
      </section>
    })
  }

  function renderMonth() {
    const monthDate = calendarDate(month)
    const offset = (monthDate.getUTCDay() + 6) % 7
    const lastDay = new Date(monthDate)
    lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0)
    const days = lastDay.getUTCDate()
    const dayEntries = day ? selected.filter((entry) => historyDate(entry) === day) : []
    const emptyDay = allEntries.some((entry) => historyDate(entry) === day) ? labels.noMatching : labels.emptyDay
    const emptyMonth = !allEntries.some((entry) => historyDate(entry).startsWith(month.slice(0, 7)))

    function moveMonth(delta: number) {
      const next = new Date(monthDate)
      next.setUTCMonth(next.getUTCMonth() + delta)
      setCalendar({ week, month: next.toISOString().slice(0, 10), day: null })
    }

    return <>
      <section aria-label={labels.calendar} className="history-calendar">
        <div className="history-calendar-nav">
          <button type="button" aria-label={labels.previousMonth} onClick={() => moveMonth(-1)}>‹</button>
          <h3 className="font-display font-extrabold capitalize">{monthFormat.format(monthDate)}</h3>
          <button type="button" aria-label={labels.nextMonth} onClick={() => moveMonth(1)}>›</button>
        </div>
        <div className="history-calendar-grid history-calendar-weekdays">{labels.weekdays.map((label) => <span key={label}>{label}</span>)}</div>
        <div className="history-calendar-grid">
          {Array.from({ length: offset }, (_, index) => <span aria-hidden="true" key={`empty-${index}`} />)}
          {Array.from({ length: days }, (_, index) => {
            const date = shiftCalendarDate(month, index)
            const entries = selected.filter((entry) => historyDate(entry) === date)
            const hasSparring = entries.some((entry) => entry.hasSparring)
            return <button key={date} type="button" aria-label={labels.dayCount(historyCalendarDayLabel(date), entries.length, hasSparring)} aria-pressed={day === date}
              onClick={() => setCalendar({ week, month, day: date })}
              className="history-calendar-day" data-training={entries.length > 0}>
              {index + 1}
              {hasSparring && <span aria-hidden="true" className="history-sparring-marker" />}
            </button>
          })}
        </div>
      </section>
      {day ? <section aria-label={labels.dayWorkouts(day)} className="space-y-2">
        <header className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-extrabold first-letter:uppercase">{historyDayLabel(day)} {day.slice(0, 4)}</h3>
          {dayEntries.length > 0 && <p className="text-[11px] font-bold text-muted">{dayEntries.length} {workoutCountNoun(dayEntries.length)}</p>}
        </header>
        {dayEntries.length ? <div className="history-week">{dayEntries.map(card)}</div> : <p className="text-sm text-muted">{incomplete ? labels.incomplete : emptyDay}</p>}
      </section> : <p className="text-center text-[13px] text-muted">{incomplete ? labels.incomplete : emptyMonth ? labels.emptyMonth : labels.chooseDay}</p>}
    </>
  }

  return <div className="space-y-3">
    <SegmentedControl ariaLabel={labels.view} options={views} value={mode} onChange={setMode} variant="outlined" />
    {week && <div className="flex items-center justify-between gap-2 text-sm">
      <p>{historyRange(week)}</p><button type="button" className="min-h-touch" onClick={clearWeek}>{labels.allWeeks}</button>
    </div>}
    {mode === 'weeks' ? renderWeeks() : renderMonth()}
  </div>
}

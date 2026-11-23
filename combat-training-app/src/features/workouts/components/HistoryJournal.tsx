import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useWorkoutData } from '@/application/workoutDataContext'
import { selectWeekPlan } from '@/application/week-plan/selectWeekPlan'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { calculateScheduledWeek } from '@/domain/week-plan/scheduledWeek'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import { calculateWeeklySummary } from '@/domain/weekly-summary/weeklySummary'
import { profileDataUnavailable } from '@/features/profile/profileDataUnavailable'
import { useProfileToday } from '@/features/profile/useProfileToday'
import { historyLabels as labels } from '../historyLabels'
import type { WorkoutHistoryListItem, WorkoutHistoryMutationResult, WorkoutsSortOrder } from '../types/workoutsView.types'
import { groupHistoryWeeks, historyDate, historyInWeek, historyRange, initialHistoryMonth } from '../utils/historyWeeks'
import { WorkoutHistoryCard } from './WorkoutHistoryCard'

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
    if (!groups.length) return <p className="p-3 text-sm text-muted">{incomplete ? labels.incomplete : labels.emptyWeek}</p>
    return groups.map((group) => {
      if (group.emptyWeeks) {
        return incomplete ? null : <p key={group.start} className="border border-dashed border-bd p-3 text-center text-sm text-muted">
          {historyRange(group.start, group.end)} · {labels.gap(group.emptyWeeks)}
        </p>
      }
      const summary = calculateWeeklySummary(group.start, sessions.items)
      const selectedPlan = selectWeekPlan(weekPlans, group.start)
      const plan = !incomplete && selectedPlan.status === 'ready' && selectedPlan.plan
        ? calculateScheduledWeek(selectedPlan.plan, sessions.items, today) : null
      const stats = [
        contentFiltered ? labels.fullWeek : null,
        incomplete ? labels.incomplete : labels.weekSummary(summary.workoutCount, Math.ceil(summary.durationSeconds / 60)),
        plan && plan.targetCount > 0 ? labels.plan(plan.goalCount, plan.targetCount) : null,
      ].filter(Boolean).join(' · ')
      return <section key={group.start} aria-label={historyRange(group.start)} className="border border-bd">
        <header className="space-y-1 bg-surface px-3 py-2.5">
          <h3 className="text-[15px] font-bold">{group.start === currentWeek ? `${labels.currentWeek} · ` : ''}{historyRange(group.start)}</h3>
          <p className="text-[13px] text-muted">{stats}</p>
        </header>
        {group.sessions.length ? group.sessions.map(card) : <p className="p-3 text-sm text-muted">{labels.noMatching}</p>}
      </section>
    })
  }

  function renderMonth() {
    const monthDate = new Date(`${month}T12:00:00Z`)
    const offset = (monthDate.getUTCDay() + 6) % 7
    const lastDay = new Date(monthDate)
    lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0)
    const days = lastDay.getUTCDate()
    const dayEntries = day ? selected.filter((entry) => historyDate(entry) === day) : []
    const emptyDay = allEntries.some((entry) => historyDate(entry) === day) ? labels.noMatching : labels.emptyDay

    function moveMonth(delta: number) {
      const next = new Date(monthDate)
      next.setUTCMonth(next.getUTCMonth() + delta)
      setCalendar({ week, month: next.toISOString().slice(0, 10), day: null })
    }

    return <>
      <section aria-label={labels.calendar} className="space-y-3 border border-bd p-3">
        <div className="flex items-center justify-between">
          <button type="button" aria-label={labels.previousMonth} onClick={() => moveMonth(-1)} className="size-11">‹</button>
          <h3 className="font-bold">{new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(monthDate)}</h3>
          <button type="button" aria-label={labels.nextMonth} onClick={() => moveMonth(1)} className="size-11">›</button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs text-muted">{labels.weekdays.map((label) => <span key={label}>{label}</span>)}</div>
        <div className="grid grid-cols-7">
          {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}
          {Array.from({ length: days }, (_, index) => {
            const date = shiftCalendarDate(month, index)
            const count = selected.filter((entry) => historyDate(entry) === date).length
            return <button key={date} type="button" aria-label={labels.dayCount(date, count)} aria-pressed={day === date}
              onClick={() => setCalendar({ week, month, day: date })}
              className={`flex min-h-touch min-w-0 flex-col items-center justify-center gap-1 border ${day === date ? 'border-crimson bg-elevated' : 'border-transparent'}`}>
              {index + 1}<span aria-hidden="true" className={`size-1.5 rounded-full ${count ? 'bg-crimson' : 'bg-transparent'}`} />
            </button>
          })}
        </div>
      </section>
      {day ? <section aria-label={labels.dayWorkouts(day)} className="space-y-2">
        <h3 className="font-bold">{day}</h3>
        {dayEntries.length ? dayEntries.map(card) : <p className="text-sm text-muted">{incomplete ? labels.incomplete : emptyDay}</p>}
      </section> : <p className="text-sm text-muted">{labels.chooseDay}</p>}
    </>
  }

  return <div className="space-y-3">
    <SegmentedControl ariaLabel={labels.view} options={[{ label: labels.weeks, value: 'weeks' }, { label: labels.month, value: 'month' }]} value={mode} onChange={setMode} />
    {week && <div className="flex items-center justify-between gap-2 text-sm">
      <p>{historyRange(week)}</p><button type="button" className="min-h-touch" onClick={clearWeek}>{labels.allWeeks}</button>
    </div>}
    {mode === 'weeks' ? renderWeeks() : renderMonth()}
  </div>
}

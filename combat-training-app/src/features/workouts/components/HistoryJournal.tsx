import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useWorkoutData } from '@/application/workoutDataContext'
import { selectWeekPlan } from '@/application/week-plan/selectWeekPlan'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import { calculateWeeklySummary } from '@/domain/weekly-summary/weeklySummary'
import { weekTarget } from '@/domain/weekly-summary/progressOverview'
import { profileDataUnavailable } from '@/features/profile/profileDataUnavailable'
import type { WorkoutHistoryListItem, WorkoutHistoryMutationResult, WorkoutsSortOrder } from '../types/workoutsView.types'
import { groupHistoryWeeks, historyRange } from '../utils/historyWeeks'
import { WorkoutHistoryCard } from './WorkoutHistoryCard'

export function HistoryJournal({ history, onUpdateNote, onDelete, sortOrder }: { history: readonly WorkoutHistoryListItem[]; sortOrder: WorkoutsSortOrder;
  onUpdateNote: (id: string, note: string) => Promise<WorkoutHistoryMutationResult>; onDelete: (id: string) => Promise<WorkoutHistoryMutationResult> }) {
  const { currentWeek, sessions, weekPlans } = useWorkoutData()
  const incomplete = profileDataUnavailable(sessions)
  const [params, setParams] = useSearchParams()
  const week = params.get('week')
  const validWeek = week && /^\d{4}-\d{2}-\d{2}$/.test(week) && Number.isFinite(Date.parse(week)) ? week : null
  const [mode, setMode] = useState<'weeks' | 'month'>('weeks')
  const [month, setMonth] = useState(() => (validWeek ?? currentWeek).slice(0, 7) + '-01')
  const [day, setDay] = useState<string | null>(null)
  const selected = validWeek ? history.filter((item) => (item.workoutDate ?? item.completedAt.slice(0, 10)) >= validWeek && (item.workoutDate ?? item.completedAt.slice(0, 10)) <= shiftCalendarDate(validWeek, 6)) : history
  const groups = groupHistoryWeeks(selected, validWeek ?? currentWeek)
  if (sortOrder === 'oldest') groups.reverse()
  const card = (item: WorkoutHistoryListItem) => <WorkoutHistoryCard key={item.id} session={item} onUpdateNote={onUpdateNote} onDelete={onDelete} />
  const monthDate = new Date(`${month}T12:00:00Z`)
  const offset = (monthDate.getUTCDay() + 6) % 7
  const days = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)).getUTCDate()
  function moveMonth(delta: number) {
    const next = new Date(`${month}T12:00:00Z`); next.setUTCMonth(next.getUTCMonth() + delta)
    setMonth(next.toISOString().slice(0, 10)); setDay(null)
  }
  return <div className="space-y-3">
    <SegmentedControl ariaLabel="Widok historii" options={[{ label: 'Tygodnie', value: 'weeks' }, { label: 'Miesiąc', value: 'month' }]} value={mode} onChange={setMode} />
    {validWeek && <div className="flex items-center justify-between gap-2 text-sm"><p>{historyRange(validWeek)}</p><button type="button" className="min-h-touch underline" onClick={() => { const next = new URLSearchParams(params); next.delete('week'); setParams(next) }}>Wszystkie tygodnie</button></div>}
    {mode === 'weeks' ? <>
      {!selected.length && <p className="p-3 text-sm text-muted">Brak treningów w tym tygodniu.</p>}
      {groups.map((group) => {
        if (group.emptyWeeks) return <p key={group.start} className="border border-dashed border-bd p-3 text-center text-sm text-muted">{historyRange(group.start, group.end)} · {group.emptyWeeks === 1 ? 'przerwa (0 treningów)' : `przerwa ${group.emptyWeeks} tyg. (0 treningów)`}</p>
        const plan = selectWeekPlan(weekPlans, group.start)
        const target = plan.status === 'ready' ? weekTarget(plan.plan) : null
        const summary = calculateWeeklySummary(group.start, sessions.items)
        return <section key={group.start} aria-label={historyRange(group.start)} className="border border-bd">
          <header className="space-y-1 bg-surface px-3 py-2.5"><h3 className="text-[15px] font-bold">{group.start === currentWeek ? 'Ten tydzień · ' : ''}{historyRange(group.start)}</h3>
            <p className="text-[13px] text-muted">{incomplete ? 'Historia niepełna · podsumowanie niedostępne' : `${summary.workoutCount} treningów · ${Math.ceil(summary.durationSeconds / 60)} min${target !== null ? ` · plan ${summary.workoutCount}/${target}` : ''}`}</p></header>
          {group.sessions.map(card)}
        </section>
      })}
    </> : <>
      <section aria-label="Kalendarz treningów" className="space-y-3 border border-bd p-3">
        <div className="flex items-center justify-between"><button type="button" aria-label="Poprzedni miesiąc" onClick={() => moveMonth(-1)} className="size-11">‹</button>
          <h3 className="font-bold">{new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(monthDate)}</h3>
          <button type="button" aria-label="Następny miesiąc" onClick={() => moveMonth(1)} className="size-11">›</button></div>
        <div className="grid grid-cols-7 text-center text-xs text-muted">{['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].map((label) => <span key={label}>{label}</span>)}</div>
        <div className="grid grid-cols-7">{Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}
          {Array.from({ length: days }, (_, index) => {
            const date = shiftCalendarDate(month, index)
            const count = selected.filter((entry) => (entry.workoutDate ?? entry.completedAt.slice(0, 10)) === date).length
            return <button key={date} type="button" aria-label={`${date}: ${count} treningów`} aria-pressed={day === date} onClick={() => setDay(date)}
              className={`flex min-h-touch min-w-0 flex-col items-center justify-center gap-1 border ${day === date ? 'border-crimson bg-elevated' : 'border-transparent'}`}>
              {index + 1}<span aria-hidden="true" className={`size-1.5 rounded-full ${count ? 'bg-crimson' : 'bg-transparent'}`} />
            </button>
          })}</div>
      </section>
      {day ? <section aria-label={`Treningi ${day}`} className="space-y-2"><h3 className="font-bold">{day}</h3>
        {selected.filter((entry) => (entry.workoutDate ?? entry.completedAt.slice(0, 10)) === day).map(card)}
        {!selected.some((entry) => (entry.workoutDate ?? entry.completedAt.slice(0, 10)) === day) && <p className="text-sm text-muted">Brak treningów tego dnia.</p>}
      </section> : <p className="text-sm text-muted">Wybierz dzień, aby zobaczyć wpisy.</p>}
    </>}
  </div>
}

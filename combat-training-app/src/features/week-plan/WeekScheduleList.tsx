import type { ReactNode } from 'react'
import type { WeekActivity, Weekday } from '@/domain/week-plan/weekPlan.types'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import { scheduleLabels as labels, weekdays } from './scheduleLabels'

export function WeekScheduleList({ items, weekStart, today, recurring = false, disabled, onAdd, renderEntry }: {
  items: readonly WeekActivity[]; weekStart: string; today?: string; recurring?: boolean; disabled: boolean
  onAdd: (day: Weekday | null) => void; renderEntry: (item: WeekActivity) => ReactNode
}) {
  const add = (day: Weekday) => <button type="button" aria-label={`Dodaj trening: ${weekdays[day].name.toLocaleLowerCase('pl-PL')}`} disabled={disabled}
    className="flex size-11 items-center justify-center rounded-[2px] border border-dashed border-bd text-xl text-muted" onClick={() => onAdd(day)}>+</button>
  return <>
    <ol aria-label={recurring ? labels.recurringList : labels.list} className="divide-y divide-bd rounded-sm border border-bd bg-surface">
      {weekdays.map(({ day, short, name }) => {
        const date = shiftCalendarDate(weekStart, day), entries = items.filter((item) => item.day === day), isToday = !recurring && date === today
        return <li key={day} id={recurring ? undefined : `day-${date}`} tabIndex={-1} aria-label={recurring ? name : `${name} ${date}`} className={`grid min-h-16 grid-cols-[44px_minmax(0,1fr)] gap-2.5 px-3 py-2.5 ${isToday ? 'schedule-today' : ''}`}>
          <div className={`text-[11px] font-bold uppercase leading-tight tracking-wider ${isToday ? 'text-crimson-ink' : 'text-muted'}`}>{short}
            {!recurring && <b className="block text-[17px] tracking-normal text-ink">{Number(date.slice(-2))}</b>}{isToday && <span className="block">{labels.today}</span>}</div>
          <div className="min-w-0">{entries.map(renderEntry)}{(!entries.length || recurring) && <div className="flex items-center justify-between gap-2">{!entries.length && <span className="inline-flex items-center gap-1.5 text-xs font-bold text-success-ink"><i aria-hidden="true" className="size-2.5 rounded-full border-2 border-success" />{labels.free}</span>}{add(day)}</div>}</div>
        </li>
      })}
    </ol>
    <section id="flexible-workouts" tabIndex={-1} aria-label={labels.anySection} className="space-y-1.5 border border-bd bg-surface p-3">
      <div className="flex items-center justify-between gap-2"><h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">{labels.anySection}</h2>
        <button type="button" disabled={disabled} className="flex min-h-touch shrink-0 items-center gap-1.5 rounded-[2px] border border-bd px-3 text-sm font-semibold" onClick={() => onAdd(null)}><span aria-hidden="true">+</span>{labels.addShort}</button></div>
      {items.filter((item) => item.day === null).map(renderEntry)}
    </section>
  </>
}

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { WorkoutsFilterState } from '@/features/workouts/types/workoutsView.types'
import { countActiveWorkoutsFilters, WORKOUTS_DISCIPLINE_FILTER_OPTIONS, WORKOUTS_SORT_OPTIONS } from '@/features/workouts/utils/workoutsFilters'
import { workoutsFilterLabels as labels } from '../workoutsFilterLabels'

interface WorkoutsFiltersProps {
  filters: WorkoutsFilterState
  onChange: (next: WorkoutsFilterState) => void
  idPrefix: string
  addAction: ReactNode
  history?: boolean
}

const buttonClass = 'flex min-h-touch shrink-0 items-center justify-center gap-1.5 rounded-[2px] border bg-surface px-3 text-sm font-semibold text-ink'

export function WorkoutsFilters({ filters, onChange, idPrefix, addAction, history = false }: WorkoutsFiltersProps) {
  const [expanded, setExpanded] = useState(false)
  const panelId = `${idPrefix}-filters`
  const sortId = `${idPrefix}-sort`
  const activeCount = countActiveWorkoutsFilters(filters)
  const strip = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!expanded || !strip.current) return
    const selected = strip.current.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (selected) strip.current.scrollTo({ left: selected.offsetLeft - 4, behavior: 'instant' })
  }, [expanded, filters.discipline])

  const search = <label className={history ? 'history-search-label' : 'flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[2px] border border-bd bg-input px-3 text-muted'}>
    <svg aria-hidden="true" width={history ? 16 : 18} height={history ? 16 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
    <span className="sr-only">{history ? labels.searchHistory : labels.search}</span>
    <input type="search" value={filters.searchQuery} onChange={(event) => onChange({ ...filters, searchQuery: event.target.value })}
      placeholder={labels.searchPlaceholder} className="h-full min-w-0 w-full bg-transparent text-base text-ink placeholder:text-muted" />
  </label>
  const filterIcon = <svg aria-hidden="true" width={history ? 14 : 18} height={history ? 14 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
  const filterToggle = <button type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded(!expanded)}
    aria-label={history ? activeCount ? labels.activeFilters(activeCount) : labels.filters : undefined}
    className={history ? 'history-filter-toggle' : `${buttonClass} ${expanded ? 'border-crimson' : 'border-bd'}`}>
    {history ? <span className="history-filter-icon">{filterIcon}{activeCount > 0 && <span aria-hidden="true" className="history-filter-dot" />}</span>
      : <>{filterIcon}
        {labels.filters}{activeCount > 0 && <span className="inline-flex size-[18px] items-center justify-center rounded-[4px] bg-crimson text-[11px] font-bold text-on-accent">{activeCount}</span>}
      </>}
  </button>

  return <div className={history ? 'space-y-2' : 'space-y-3'}>
    <div className={history ? 'flex items-center gap-1.5' : 'flex items-center gap-2'}>
      {history ? <div className="history-search-box">{search}{filterToggle}</div> : <>{search}{filterToggle}</>}
      {addAction}
    </div>
    <div id={panelId} hidden={!expanded} className={history ? 'history-filter-panel' : 'min-w-0 space-y-3 border border-bd bg-surface p-3'}>
      <div role="group" aria-label={labels.discipline} className="min-w-0 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{labels.discipline}</p>
        <div ref={strip} className="relative flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-1 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {WORKOUTS_DISCIPLINE_FILTER_OPTIONS.map((option) => <button key={option.value} type="button"
            aria-pressed={filters.discipline === option.value} onClick={() => onChange({ ...filters, discipline: option.value })}
            className={history ? 'history-filter-chip snap-start' : `min-h-touch shrink-0 snap-start whitespace-nowrap rounded-[2px] px-3 text-[13px] ${filters.discipline === option.value ? 'border-2 border-crimson bg-elevated font-semibold text-ink' : 'border border-bd bg-surface text-muted'}`}>
            {option.labelPl}
          </button>)}
        </div>
      </div>
      {history ? <div role="group" aria-label={labels.sort} className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{labels.sort}</p>
        <div className="flex flex-wrap gap-1.5">
          {WORKOUTS_SORT_OPTIONS.map((option) => <button key={option.value} type="button" className="history-filter-chip"
            aria-pressed={filters.sortOrder === option.value} onClick={() => onChange({ ...filters, sortOrder: option.value })}>{option.labelPl}</button>)}
        </div>
      </div> : <div>
        <label htmlFor={sortId} className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{labels.sort}</label>
        <select id={sortId} value={filters.sortOrder} onChange={(event) => onChange({ ...filters, sortOrder: event.target.value as WorkoutsFilterState['sortOrder'] })}
          className="min-h-touch w-full border border-bd bg-input px-3 py-2 text-base text-ink">
          {WORKOUTS_SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.labelPl}</option>)}
        </select>
      </div>}
      <button type="button" className={history ? 'history-filter-chip' : `${buttonClass} border-bd`} onClick={() => onChange({ ...filters, discipline: 'all', sortOrder: 'newest' })}>{labels.clear}</button>
    </div>
  </div>
}

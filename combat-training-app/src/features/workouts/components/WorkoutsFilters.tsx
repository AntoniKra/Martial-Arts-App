import type { WorkoutsFilterState } from '@/features/workouts/types/workoutsView.types'
import {
  WORKOUTS_DISCIPLINE_FILTER_OPTIONS,
  WORKOUTS_SORT_OPTIONS,
} from '@/features/workouts/utils/workoutsFilters'

interface WorkoutsFiltersProps {
  filters: WorkoutsFilterState
  onChange: (next: WorkoutsFilterState) => void
  idPrefix: string
}

const fieldClassName =
  'min-h-touch w-full border border-bd bg-elevated px-3 py-2 font-display text-[13px] text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]'

export function WorkoutsFilters({ filters, onChange, idPrefix }: WorkoutsFiltersProps) {
  const searchId = `${idPrefix}-search`
  const disciplineId = `${idPrefix}-discipline`
  const sortId = `${idPrefix}-sort`

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      <div className="md:col-span-2 lg:col-span-1">
        <label htmlFor={searchId} className="mb-1.5 block font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
          Szukaj po nazwie
        </label>
        <input
          id={searchId}
          type="search"
          value={filters.searchQuery}
          onChange={(event) => onChange({ ...filters, searchQuery: event.target.value })}
          placeholder="Nazwa planu lub treningu"
          className={fieldClassName}
        />
      </div>

      <div>
        <label htmlFor={disciplineId} className="mb-1.5 block font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
          Dyscyplina
        </label>
        <select
          id={disciplineId}
          value={filters.discipline}
          onChange={(event) =>
            onChange({
              ...filters,
              discipline: event.target.value as WorkoutsFilterState['discipline'],
            })
          }
          className={fieldClassName}
        >
          {WORKOUTS_DISCIPLINE_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.labelPl}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={sortId} className="mb-1.5 block font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
          Sortowanie
        </label>
        <select
          id={sortId}
          value={filters.sortOrder}
          onChange={(event) =>
            onChange({
              ...filters,
              sortOrder: event.target.value as WorkoutsFilterState['sortOrder'],
            })
          }
          className={fieldClassName}
        >
          {WORKOUTS_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.labelPl}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

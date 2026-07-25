import { useId, useRef, useState, type FormEvent } from 'react'

import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { Combination } from '@/domain/combination/combination.types'
import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import { getDisciplineLabelPl } from '@/domain/discipline/disciplineLabels'
import type { WorkoutBlockType } from '@/domain/workout/workout.types'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { EXERCISE_LIBRARY_FIXTURES } from '@/features/workout-builder/data/exerciseLibraryFixtures'
import { PlusIcon } from '@/features/workout-builder/components/MoveIcons'
import type {
  ExerciseLibraryUiState,
  ExerciseSelection,
} from '@/features/workout-builder/components/workoutBuilderUi.types'
import { EXERCISE_NAME_MAX_LENGTH } from '@/features/workout-builder/state/workoutBuilder.types'
import { filterExerciseLibrary } from '@/features/workout-builder/utils/exerciseLibraryFilters'

interface ExerciseLibraryViewProps {
  blockType: WorkoutBlockType
  disciplineKey: DisciplineKey
  libraryUiState: ExerciseLibraryUiState
  onLibraryUiStateChange: (nextState: ExerciseLibraryUiState) => void
  onBack: () => void
  onConfigure: (selection: ExerciseSelection) => void
}

const contentContainerClass = 'mx-auto w-full max-w-lg px-4 md:max-w-2xl'

const fieldClassName =
  'min-h-touch w-full border border-bd bg-elevated px-3 py-2 font-display text-[13px] text-ink placeholder:text-faint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]'

const labelClassName =
  'mb-1.5 block font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint'

function LibraryResultButton({
  combination,
  onSelect,
}: {
  combination: Combination
  onSelect: (combination: Combination) => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(combination)}
        className="flex min-h-touch w-full items-center justify-between gap-3 border border-bd bg-surface px-4 py-3 text-left transition-colors hover:border-muted/50 hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--app-focus-ring)]"
      >
        <span className="font-display text-[13px] font-semibold text-ink">{combination.namePl}</span>
        <PlusIcon className="shrink-0 text-muted" />
      </button>
    </li>
  )
}

export function ExerciseLibraryView({
  blockType,
  disciplineKey,
  libraryUiState,
  onLibraryUiStateChange,
  onBack,
  onConfigure,
}: ExerciseLibraryViewProps) {
  const searchId = useId()
  const customNameId = useId()
  const customNameErrorId = useId()
  const customNameRef = useRef<HTMLInputElement>(null)
  const [customNameError, setCustomNameError] = useState<string | null>(null)

  const blockLabel = getWorkoutBlockLabelPl(blockType)
  const disciplineLabel = getDisciplineLabelPl(disciplineKey)
  const filteredCombinations = filterExerciseLibrary(
    EXERCISE_LIBRARY_FIXTURES,
    disciplineKey,
    blockType,
    libraryUiState.searchQuery,
  )

  function handleSelectCombination(combination: Combination) {
    onConfigure({
      type: 'library',
      combinationId: combination.id,
      exerciseNameSnapshot: combination.namePl,
    })
  }

  function handleConfigureCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = libraryUiState.customName.trim()

    if (trimmedName.length === 0) {
      setCustomNameError('Nazwa ćwiczenia jest wymagana.')
      requestAnimationFrame(() => {
        customNameRef.current?.focus()
      })
      return
    }

    setCustomNameError(null)
    onConfigure({
      type: 'custom',
      exerciseNameSnapshot: trimmedName,
    })
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-bd bg-surface">
        <div className={`${contentContainerClass} py-4`}>
          <button
            type="button"
            onClick={onBack}
            className="mb-4 inline-flex min-h-touch items-center gap-1 font-display text-[12px] font-semibold tracking-[0.04em] text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
          >
            <ChevronRightIcon className="rotate-180" />
            Wróć do osi treningu
          </button>

          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
            Blok docelowy · {blockLabel}
          </p>
          <p className="mt-1 text-[13px] text-muted">
            Dyscyplina: <span className="font-semibold text-ink">{disciplineLabel}</span>
          </p>

          <h1 className="mt-4 font-display text-[24px] font-bold text-ink md:text-[28px]">Dodaj ćwiczenie</h1>

          <div className="mt-5">
            <SegmentedControl
              ariaLabel="Źródło ćwiczenia"
              options={[
                { label: 'Biblioteka', value: 'library' },
                { label: 'Własne ćwiczenie', value: 'custom' },
              ]}
              value={libraryUiState.tab}
              onChange={(tab) => onLibraryUiStateChange({ ...libraryUiState, tab })}
            />
          </div>

          {libraryUiState.tab === 'library' ? (
            <div className="mt-4">
              <label htmlFor={searchId} className={labelClassName}>
                Szukaj
              </label>
              <input
                id={searchId}
                type="search"
                value={libraryUiState.searchQuery}
                placeholder="Szukaj kombinacji…"
                className={fieldClassName}
                onChange={(event) =>
                  onLibraryUiStateChange({ ...libraryUiState, searchQuery: event.target.value })
                }
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className={`${contentContainerClass} py-4`}>
          {libraryUiState.tab === 'library' ? (
            filteredCombinations.length > 0 ? (
              <ul className="space-y-2" aria-label="Wyniki biblioteki ćwiczeń">
                {filteredCombinations.map((combination) => (
                  <LibraryResultButton
                    key={combination.id}
                    combination={combination}
                    onSelect={handleSelectCombination}
                  />
                ))}
              </ul>
            ) : (
              <p className="border border-bd bg-surface px-4 py-4 text-[13px] leading-relaxed text-muted">
                Brak wyników dla wybranej dyscypliny, bloku i wyszukiwania. Spróbuj innej frazy albo
                przejdź do zakładki „Własne ćwiczenie”.
              </p>
            )
          ) : (
            <form onSubmit={handleConfigureCustom} className="space-y-4">
              <div>
                <label htmlFor={customNameId} className={labelClassName}>
                  Nazwa ćwiczenia
                </label>
                <input
                  ref={customNameRef}
                  id={customNameId}
                  type="text"
                  value={libraryUiState.customName}
                  maxLength={EXERCISE_NAME_MAX_LENGTH}
                  placeholder="Opisz ćwiczenie…"
                  className={fieldClassName}
                  aria-invalid={customNameError ? true : undefined}
                  aria-describedby={customNameError ? customNameErrorId : undefined}
                  onChange={(event) => {
                    setCustomNameError(null)
                    onLibraryUiStateChange({ ...libraryUiState, customName: event.target.value })
                  }}
                />
                {customNameError ? (
                  <p id={customNameErrorId} className="mt-2 text-[13px] leading-relaxed text-crimson">
                    {customNameError}
                  </p>
                ) : null}
              </div>

              <Button type="submit" variant="secondary" className="w-full">
                Konfiguruj ćwiczenie
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

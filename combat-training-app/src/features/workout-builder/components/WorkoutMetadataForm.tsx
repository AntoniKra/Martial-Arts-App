import type { Dispatch } from 'react'

import { DisciplineBadge } from '@/components/domain/DisciplineBadge'
import type {
  WorkoutBuilderAction,
  WorkoutBuilderState,
} from '@/features/workout-builder/state/workoutBuilder.types'
import {
  CUSTOM_NAME_MAX_LENGTH,
  MAIN_GOAL_MAX_LENGTH,
  WORKOUT_BUILDER_DISCIPLINE_KEYS,
} from '@/features/workout-builder/state/workoutBuilder.types'
import { selectCanEditDiscipline } from '@/features/workout-builder/state/workoutBuilder.selectors'

interface WorkoutMetadataFormProps {
  state: WorkoutBuilderState
  dispatch: Dispatch<WorkoutBuilderAction>
}

const fieldClassName =
  'min-h-touch w-full border border-bd bg-elevated px-3 py-2 font-display text-[13px] text-ink placeholder:text-faint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60'

const labelClassName =
  'mb-1.5 block font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint'

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function WorkoutMetadataForm({ state, dispatch }: WorkoutMetadataFormProps) {
  const { draft } = state
  const canEditDiscipline = selectCanEditDiscipline(state)
  const customNameId = 'workout-builder-custom-name'
  const mainGoalId = 'workout-builder-main-goal'

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3" disabled={!canEditDiscipline}>
        <legend className={labelClassName}>Dyscyplina</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {WORKOUT_BUILDER_DISCIPLINE_KEYS.map((disciplineKey) => {
            const isSelected = draft.disciplineKey === disciplineKey
            const inputId = `workout-builder-discipline-${disciplineKey}`

            return (
              <label
                key={disciplineKey}
                htmlFor={inputId}
                className={[
                  'flex min-h-touch cursor-pointer items-center justify-between border px-3 py-3 transition-colors',
                  canEditDiscipline ? 'hover:border-muted/50' : 'cursor-not-allowed opacity-60',
                  isSelected
                    ? 'border-crimson bg-crimson/10 ring-1 ring-crimson/40'
                    : 'border-bd bg-elevated',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <DisciplineBadge disciplineKey={disciplineKey} className="text-[11px]" />
                <span className="flex items-center gap-2">
                  {isSelected ? (
                    <span
                      aria-hidden="true"
                      className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-crimson"
                    >
                      Wybrano
                    </span>
                  ) : null}
                  <input
                    id={inputId}
                    type="radio"
                    name="workout-builder-discipline"
                    value={disciplineKey}
                    checked={isSelected}
                    disabled={!canEditDiscipline}
                    onChange={() => dispatch({ type: 'setDiscipline', disciplineKey })}
                    className="size-4 shrink-0 accent-[var(--color-crimson)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
                  />
                </span>
              </label>
            )
          })}
        </div>
        {!canEditDiscipline ? (
          <p className="text-[13px] leading-relaxed text-muted">
            Dyscyplina jest zablokowana po dodaniu pierwszego ćwiczenia.
          </p>
        ) : null}
      </fieldset>

      <div>
        <label htmlFor={customNameId} className={labelClassName}>
          Nazwa planu <span className="font-normal normal-case tracking-normal text-faint">(opcjonalnie)</span>
        </label>
        <input
          id={customNameId}
          type="text"
          value={draft.customName ?? ''}
          maxLength={CUSTOM_NAME_MAX_LENGTH}
          placeholder="np. Trening techniczny — poniedziałek"
          className={fieldClassName}
          onChange={(event) => {
            const nextValue = event.target.value
            dispatch({
              type: 'setCustomName',
              customName: nextValue === '' ? null : nextValue,
            })
          }}
          onBlur={(event) => {
            const normalized = normalizeOptionalText(event.target.value)
            if (normalized !== draft.customName) {
              dispatch({ type: 'setCustomName', customName: normalized })
            }
          }}
        />
      </div>

      <div>
        <label htmlFor={mainGoalId} className={labelClassName}>
          Główny cel <span className="font-normal normal-case tracking-normal text-faint">(opcjonalnie)</span>
        </label>
        <textarea
          id={mainGoalId}
          value={draft.mainGoal ?? ''}
          maxLength={MAIN_GOAL_MAX_LENGTH}
          rows={3}
          placeholder="np. Poprawa timingu jab — cross"
          className={`${fieldClassName} resize-y`}
          onChange={(event) => {
            const nextValue = event.target.value
            dispatch({
              type: 'setMainGoal',
              mainGoal: nextValue === '' ? null : nextValue,
            })
          }}
          onBlur={(event) => {
            const normalized = normalizeOptionalText(event.target.value)
            if (normalized !== draft.mainGoal) {
              dispatch({ type: 'setMainGoal', mainGoal: normalized })
            }
          }}
        />
      </div>
    </div>
  )
}

import type { Dispatch } from 'react'

import { Button } from '@/components/ui/Button'
import type { WorkoutExercise, WorkoutItem } from '@/domain/workout/workout.types'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  MoveIconButton,
} from '@/features/workout-builder/components/MoveIcons'
import type { FocusRestoreTarget } from '@/features/workout-builder/components/workoutBuilderUi.types'
import type { WorkoutBuilderAction } from '@/features/workout-builder/state/workoutBuilder.types'
import {
  canMoveItemDown,
  canMoveItemUp,
} from '@/features/workout-builder/state/workoutBuilder.selectors'
import { formatSecondsAsClock } from '@/features/workout-builder/utils/formatDuration'
import { formatPolishCount } from '@/features/workout-builder/utils/polishPlural'

interface WorkoutExerciseCardProps {
  blockId: string
  blockPosition: number
  blockLabel: string
  itemPosition: number
  exercise: WorkoutExercise
  blockItems: readonly WorkoutItem[]
  dispatch: Dispatch<WorkoutBuilderAction>
  onScheduleFocusRestore: (focusTarget: FocusRestoreTarget) => void
  registerExerciseHeadingRef: (element: HTMLHeadingElement | null) => void
}

function formatExerciseContext(
  exerciseName: string,
  itemPosition: number,
  blockPosition: number,
  blockLabel: string,
): string {
  return `${exerciseName}, element ${itemPosition} w bloku ${blockPosition} — ${blockLabel}`
}

function formatRoundLabel(roundCount: number): string {
  return formatPolishCount(roundCount, 'runda', 'rundy', 'rund')
}

function formatExerciseConfigurationSummary(exercise: WorkoutExercise): string {
  if (exercise.configuration.mode === 'continuous') {
    return `Ciągłe · ${formatSecondsAsClock(exercise.configuration.durationSeconds)}`
  }

  const { roundCount, roundDurationSeconds, restBetweenRoundsSeconds } = exercise.configuration
  return `${formatRoundLabel(roundCount)} × ${formatSecondsAsClock(roundDurationSeconds)} · przerwa ${formatSecondsAsClock(restBetweenRoundsSeconds)}`
}

export function WorkoutExerciseCard({
  blockId,
  blockPosition,
  blockLabel,
  itemPosition,
  exercise,
  blockItems,
  dispatch,
  onScheduleFocusRestore,
  registerExerciseHeadingRef,
}: WorkoutExerciseCardProps) {
  const exerciseContext = formatExerciseContext(
    exercise.exerciseNameSnapshot,
    itemPosition,
    blockPosition,
    blockLabel,
  )
  const canMoveUp = canMoveItemUp(blockItems, exercise.id)
  const canMoveDown = canMoveItemDown(blockItems, exercise.id)
  const addExerciseFocusTarget: FocusRestoreTarget = { type: 'addExercise', blockId }

  return (
    <li className="border-t border-bd bg-bg/20 px-3 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3
            ref={registerExerciseHeadingRef}
            tabIndex={-1}
            className="font-display text-[14px] font-semibold leading-snug text-ink focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--app-focus-ring)]"
          >
            {exercise.exerciseNameSnapshot}
          </h3>
          <p className="mt-1 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-crimson">
            Ćwiczenie
          </p>
          <p className="mt-1 font-display text-[12px] tabular-nums text-muted">
            {formatExerciseConfigurationSummary(exercise)}
          </p>
          {exercise.instruction ? (
            <p className="mt-1 text-[12px] leading-relaxed text-muted">{exercise.instruction}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-0.5">
          <MoveIconButton
            label={`Przenieś ćwiczenie ${exerciseContext} w górę`}
            disabled={!canMoveUp}
            onClick={() => dispatch({ type: 'moveItem', blockId, itemId: exercise.id, direction: 'up' })}
          >
            <ArrowUpIcon />
          </MoveIconButton>
          <MoveIconButton
            label={`Przenieś ćwiczenie ${exerciseContext} w dół`}
            disabled={!canMoveDown}
            onClick={() => dispatch({ type: 'moveItem', blockId, itemId: exercise.id, direction: 'down' })}
          >
            <ArrowDownIcon />
          </MoveIconButton>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-h-touch px-2 text-crimson hover:text-crimson"
            aria-label={`Usuń ćwiczenie ${exerciseContext}`}
            onClick={() => {
              dispatch({ type: 'removeItem', blockId, itemId: exercise.id })
              onScheduleFocusRestore(addExerciseFocusTarget)
            }}
          >
            Usuń
          </Button>
        </div>
      </div>
    </li>
  )
}

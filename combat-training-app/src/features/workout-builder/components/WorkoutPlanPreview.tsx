import { forwardRef, type RefObject } from 'react'

import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon'
import { Button } from '@/components/ui/Button'
import { DisciplineBadge } from '@/components/domain/DisciplineBadge'
import { RedAccent } from '@/components/ui/RedAccent'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { calculateWorkoutPlanSummary } from '@/domain/workout/workoutCalculations'
import type { WorkoutExercise, WorkoutItem } from '@/domain/workout/workout.types'
import type { WorkoutPlanSaveState } from '@/features/workout-builder/components/workoutBuilderUi.types'
import type { WorkoutBuilderState } from '@/features/workout-builder/state/workoutBuilder.types'
import { formatEstimatedDuration, formatSecondsAsClock } from '@/features/workout-builder/utils/formatDuration'
import { formatPolishCount, polishPlural } from '@/features/workout-builder/utils/polishPlural'

interface WorkoutPlanPreviewProps {
  state: WorkoutBuilderState
  displayPlanName: string
  saveState: WorkoutPlanSaveState
  saveErrorRef: RefObject<HTMLDivElement | null>
  onBack: () => void
  onSave: () => void
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

function PreviewExerciseItem({ exercise }: { exercise: WorkoutExercise }) {
  return (
    <li className="border-t border-bd bg-bg/20 px-3 py-3">
      <p className="break-words font-display text-[14px] font-semibold leading-snug text-ink">
        {exercise.exerciseNameSnapshot}
      </p>
      <p className="mt-1 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-crimson">
        Ćwiczenie
      </p>
      <p className="mt-1 break-words font-display text-[12px] tabular-nums text-muted">
        {formatExerciseConfigurationSummary(exercise)}
      </p>
      {exercise.instruction ? (
        <p className="mt-1 break-words text-[12px] leading-relaxed text-muted">{exercise.instruction}</p>
      ) : null}
    </li>
  )
}

function PreviewBreakItem({ breakItem }: { breakItem: Extract<WorkoutItem, { type: 'break' }> }) {
  return (
    <li className="border-t border-bd px-3 py-3">
      <p className="font-display text-[13px] font-semibold text-ink">Przerwa</p>
      <p className="mt-0.5 font-display text-[12px] tabular-nums text-muted">
        {formatSecondsAsClock(breakItem.durationSeconds)}
      </p>
      {breakItem.instruction ? (
        <p className="mt-1 break-words text-[12px] leading-relaxed text-muted">{breakItem.instruction}</p>
      ) : null}
    </li>
  )
}

export const WorkoutPlanPreview = forwardRef<HTMLHeadingElement, WorkoutPlanPreviewProps>(
  function WorkoutPlanPreview(
    { state, displayPlanName, saveState, saveErrorRef, onBack, onSave },
    headingRef,
  ) {
    const { draft } = state
    const summary = calculateWorkoutPlanSummary(draft)
    const blockCount = draft.blocks.length
    const isSaving = saveState.status === 'saving'
    const saveErrorMessage = saveState.status === 'error' ? saveState.message : null

    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-lg px-4 py-6 md:max-w-2xl md:py-8">
            <button
              type="button"
              onClick={onBack}
              disabled={isSaving}
              className="mb-6 inline-flex min-h-touch items-center gap-1 font-display text-[12px] font-semibold tracking-[0.04em] text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRightIcon className="rotate-180" />
              Wróć do edycji
            </button>

            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
              Podgląd planu
            </p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="mt-2 break-words font-display text-[24px] font-bold text-ink focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--app-focus-ring)] md:text-[28px]"
            >
              {displayPlanName}
            </h1>

            {draft.disciplineKey !== null ? (
              <div className="mt-3">
                <DisciplineBadge disciplineKey={draft.disciplineKey} className="text-[11px]" />
              </div>
            ) : null}

            {draft.mainGoal ? (
              <p className="mt-3 max-w-prose break-words text-[14px] leading-relaxed text-muted">{draft.mainGoal}</p>
            ) : null}

            <RedAccent className="mt-8" />

            <section aria-labelledby="workout-preview-summary-heading" className="mt-8">
              <h2
                id="workout-preview-summary-heading"
                className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint"
              >
                Podsumowanie
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                <span className="tabular-nums">{blockCount}</span>{' '}
                {polishPlural(blockCount, 'blok', 'bloki', 'bloków')}
                {' · '}
                <span className="tabular-nums">{summary.exerciseCount}</span>{' '}
                {polishPlural(summary.exerciseCount, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}
                {' · '}
                <span className="tabular-nums">{summary.plannedRoundCount}</span>{' '}
                {polishPlural(summary.plannedRoundCount, 'runda', 'rundy', 'rund')}
                {' · '}
                ok. <span className="tabular-nums">{formatEstimatedDuration(summary.estimatedTotalSeconds)}</span>
              </p>
            </section>

            <section aria-labelledby="workout-preview-blocks-heading" className="mt-8 space-y-4">
              <h2
                id="workout-preview-blocks-heading"
                className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint"
              >
                Oś treningu
              </h2>

              <ol className="space-y-4" aria-label="Bloki treningu">
                {draft.blocks.map((block, blockIndex) => {
                  const blockLabel = getWorkoutBlockLabelPl(block.blockType)
                  const itemCount = block.items.length

                  return (
                    <li key={block.id} className="border border-bd bg-surface">
                      <div className="border-b border-bd px-3 py-3">
                        <h3 className="font-display text-[14px] font-semibold text-ink">
                          Blok {blockIndex + 1} · {blockLabel}
                        </h3>
                        <p className="mt-1 text-[12px] text-muted">
                          <span className="tabular-nums">{itemCount}</span>{' '}
                          {polishPlural(itemCount, 'element', 'elementy', 'elementów')}
                        </p>
                      </div>

                      {itemCount === 0 ? (
                        <p className="px-3 py-4 text-[13px] text-muted">Brak elementów w bloku.</p>
                      ) : (
                        <ol className="divide-y divide-bd" aria-label={`Elementy bloku ${blockIndex + 1}`}>
                          {block.items.map((item) =>
                            item.type === 'exercise' ? (
                              <PreviewExerciseItem key={item.id} exercise={item} />
                            ) : (
                              <PreviewBreakItem key={item.id} breakItem={item} />
                            ),
                          )}
                        </ol>
                      )}
                    </li>
                  )
                })}
              </ol>
            </section>

            <section
              aria-labelledby="workout-preview-actions-heading"
              aria-busy={isSaving}
              className="mt-8 space-y-3 pb-2"
            >
              <h2 id="workout-preview-actions-heading" className="sr-only">
                Działania podglądu planu
              </h2>

              {saveErrorMessage ? (
                <div
                  ref={saveErrorRef}
                  role="alert"
                  tabIndex={-1}
                  className="border border-bd bg-surface px-4 py-4 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--app-focus-ring)]"
                >
                  <p className="font-display text-[14px] font-semibold text-ink">Nie udało się zapisać planu</p>
                  <p className="mt-2 break-words text-[13px] leading-relaxed text-muted">{saveErrorMessage}</p>
                </div>
              ) : null}

              <Button
                type="button"
                variant="primary"
                className="w-full"
                loading={isSaving}
                disabled={isSaving}
                onClick={onSave}
              >
                {isSaving ? 'Zapisywanie…' : 'Zapisz plan'}
              </Button>

              <Button type="button" variant="secondary" className="w-full" disabled={isSaving} onClick={onBack}>
                Wróć do edycji
              </Button>
            </section>
          </div>
        </div>
      </div>
    )
  },
)

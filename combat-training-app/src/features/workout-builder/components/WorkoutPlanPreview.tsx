import { forwardRef, type RefObject } from 'react'

import { ScreenHeader } from '@/components/ScreenHeader'
import { BackIcon } from '@/components/ui/BackButton'
import { Button } from '@/components/ui/Button'
import { DisciplineBadge } from '@/components/domain/DisciplineBadge'
import { RedAccent } from '@/components/ui/RedAccent'
import { calculateWorkoutPlanSummary } from '@/domain/workout/workoutCalculations'
import { ReadOnlyWorkoutTimeline } from '@/features/workout-builder/components/ReadOnlyWorkoutTimeline'
import type { WorkoutPlanSaveState } from '@/features/workout-builder/components/workoutBuilderUi.types'
import type { WorkoutBuilderState } from '@/features/workout-builder/state/workoutBuilder.types'
import { workoutBuilderLabels } from '@/features/workout-builder/workoutBuilderLabels'
import { formatEstimatedDuration } from '@/domain/time/formatDuration'
import { polishPlural } from '@/domain/language/polishPlural'
import { countFocusExercises } from '@/domain/focus-skill/focusSkillSelectors'
import { focusSkillLabels } from '@/features/focus-skills/focusSkillLabels'

interface WorkoutPlanPreviewProps {
  state: WorkoutBuilderState
  displayPlanName: string
  saveState: WorkoutPlanSaveState
  saveErrorRef: RefObject<HTMLDivElement | null>
  onBack: () => void
  onSave: () => void
}

export const WorkoutPlanPreview = forwardRef<HTMLHeadingElement, WorkoutPlanPreviewProps>(
  function WorkoutPlanPreview(
    { state, displayPlanName, saveState, saveErrorRef, onBack, onSave },
    headingRef,
  ) {
    const { draft } = state
    const summary = calculateWorkoutPlanSummary(draft)
    const focusExerciseCount = countFocusExercises(draft.blocks)
    const blockCount = draft.blocks.length
    const isSaving = saveState.status === 'saving'
    const saveErrorMessage = saveState.status === 'error' ? saveState.message : null

    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-lg px-4 py-6 md:max-w-2xl md:py-8">
            <ScreenHeader title={displayPlanName} headingRef={headingRef} onBack={onBack} disabled={isSaving} subtitle={workoutBuilderLabels.previewPlan} />
            <p className="mt-2 text-[13px] text-muted">{focusSkillLabels.planCount(focusExerciseCount)}</p>

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

            <section aria-labelledby="workout-preview-blocks-heading" className="mt-8 space-y-3">
              <h2
                id="workout-preview-blocks-heading"
                className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint"
              >
                {workoutBuilderLabels.timelineHeading}
              </h2>
              <ReadOnlyWorkoutTimeline blocks={draft.blocks} />
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
                  <p className="font-display text-[14px] font-semibold text-ink">{workoutBuilderLabels.saveFailed}</p>
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
                {isSaving ? workoutBuilderLabels.saving : workoutBuilderLabels.savePlan}
              </Button>

              <Button type="button" variant="secondary" className="w-full" disabled={isSaving} onClick={onBack}>
                <span className="inline-flex items-center gap-2">
                  <BackIcon size={16} />{workoutBuilderLabels.returnToEditing}
                </span>
              </Button>
            </section>
          </div>
        </div>
      </div>
    )
  },
)

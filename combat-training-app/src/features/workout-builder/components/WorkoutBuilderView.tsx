import type { Dispatch } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { routes } from '@/app/routes'
import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon'
import { getButtonClassName } from '@/components/ui/Button'
import { RedAccent } from '@/components/ui/RedAccent'
import type { ExerciseConfiguration } from '@/domain/workout/workout.types'
import { validateWorkoutPlanDraft, type WorkoutPlanValidationIssue } from '@/domain/workout/workoutValidation'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { ExerciseConfigurationView } from '@/features/workout-builder/components/ExerciseConfigurationView'
import { ExerciseLibraryView } from '@/features/workout-builder/components/ExerciseLibraryView'
import { WorkoutMetadataForm } from '@/features/workout-builder/components/WorkoutMetadataForm'
import { WorkoutPlanPreview } from '@/features/workout-builder/components/WorkoutPlanPreview'
import { WorkoutTimeline } from '@/features/workout-builder/components/WorkoutTimeline'
import { WorkoutValidationSummary } from '@/features/workout-builder/components/WorkoutValidationSummary'
import type {
  ExerciseLibraryUiState,
  ExerciseSelection,
  WorkoutBuilderScreen,
} from '@/features/workout-builder/components/workoutBuilderUi.types'
import { createWorkoutExercise } from '@/features/workout-builder/state/workoutBuilder.factories'
import type {
  WorkoutBuilderAction,
  WorkoutBuilderState,
} from '@/features/workout-builder/state/workoutBuilder.types'
import {
  selectBlockById,
  selectDisplayPlanName,
  selectExerciseById,
  selectInheritedExerciseConfiguration,
} from '@/features/workout-builder/state/workoutBuilder.selectors'
import { copyExerciseConfiguration } from '@/features/workout-builder/utils/exerciseConfigurationCompare'

interface WorkoutBuilderViewProps {
  state: WorkoutBuilderState
  dispatch: Dispatch<WorkoutBuilderAction>
}

const initialLibraryUiState: ExerciseLibraryUiState = {
  tab: 'library',
  searchQuery: '',
  customName: '',
}

export function WorkoutBuilderView({ state, dispatch }: WorkoutBuilderViewProps) {
  const [screen, setScreen] = useState<WorkoutBuilderScreen>({ type: 'edit' })
  const [libraryUiState, setLibraryUiState] = useState<ExerciseLibraryUiState>(initialLibraryUiState)
  const [pendingAddedExerciseId, setPendingAddedExerciseId] = useState<string | null>(null)
  const [pendingAddExerciseBlockId, setPendingAddExerciseBlockId] = useState<string | null>(null)
  const [pendingEditExerciseId, setPendingEditExerciseId] = useState<string | null>(null)
  const [validationIssues, setValidationIssues] = useState<WorkoutPlanValidationIssue[] | null>(null)
  const [pendingPreviewHeadingFocus, setPendingPreviewHeadingFocus] = useState(false)
  const [pendingPreviewButtonFocus, setPendingPreviewButtonFocus] = useState(false)
  const [pendingValidationSummaryFocus, setPendingValidationSummaryFocus] = useState(false)

  const previewButtonRef = useRef<HTMLButtonElement>(null)
  const previewHeadingRef = useRef<HTMLHeadingElement>(null)
  const validationSummaryRef = useRef<HTMLDivElement>(null)

  const displayPlanName = selectDisplayPlanName(state)

  function openExerciseLibrary(blockId: string) {
    setLibraryUiState(initialLibraryUiState)
    setScreen({ type: 'library', blockId })
  }

  function cancelExerciseLibrary(blockId: string) {
    setScreen({ type: 'edit' })
    setPendingAddExerciseBlockId(blockId)
  }

  function openExerciseConfiguration(selection: ExerciseSelection) {
    if (screen.type !== 'library') {
      return
    }

    setScreen({
      type: 'configureNew',
      blockId: screen.blockId,
      selection,
    })
  }

  function openExerciseEdit(blockId: string, exerciseId: string) {
    setScreen({ type: 'configureExisting', blockId, exerciseId })
  }

  function backToLibraryFromConfigureNew() {
    if (screen.type !== 'configureNew') {
      return
    }

    setScreen({ type: 'library', blockId: screen.blockId })
  }

  function cancelExerciseEdit(exerciseId: string) {
    setScreen({ type: 'edit' })
    setPendingEditExerciseId(exerciseId)
  }

  function handlePreviewPlan() {
    const result = validateWorkoutPlanDraft(state.draft)

    if (result.isValid) {
      setValidationIssues(null)
      setScreen({ type: 'preview' })
      setPendingPreviewHeadingFocus(true)
      return
    }

    setValidationIssues(result.issues)
    setPendingValidationSummaryFocus(true)
  }

  function backToEditFromPreview() {
    setScreen({ type: 'edit' })
    setPendingPreviewButtonFocus(true)
  }

  useEffect(() => {
    setValidationIssues(null)
  }, [state.draft])

  useEffect(() => {
    if (
      screen.type !== 'library' &&
      screen.type !== 'configureNew' &&
      screen.type !== 'configureExisting'
    ) {
      return
    }

    const block = selectBlockById(state.draft.blocks, screen.blockId)

    if (!block || state.draft.disciplineKey === null) {
      setScreen({ type: 'edit' })
      return
    }

    if (screen.type === 'configureExisting') {
      const exercise = selectExerciseById(block, screen.exerciseId)

      if (!exercise) {
        setScreen({ type: 'edit' })
      }
    }
  }, [screen, state.draft.blocks, state.draft.disciplineKey])

  useEffect(() => {
    if (!pendingPreviewHeadingFocus) {
      return
    }

    const frame = requestAnimationFrame(() => {
      previewHeadingRef.current?.focus()
      setPendingPreviewHeadingFocus(false)
    })

    return () => cancelAnimationFrame(frame)
  }, [pendingPreviewHeadingFocus])

  useEffect(() => {
    if (!pendingPreviewButtonFocus) {
      return
    }

    const frame = requestAnimationFrame(() => {
      previewButtonRef.current?.focus()
      setPendingPreviewButtonFocus(false)
    })

    return () => cancelAnimationFrame(frame)
  }, [pendingPreviewButtonFocus])

  useEffect(() => {
    if (!pendingValidationSummaryFocus) {
      return
    }

    const frame = requestAnimationFrame(() => {
      validationSummaryRef.current?.focus()
      setPendingValidationSummaryFocus(false)
    })

    return () => cancelAnimationFrame(frame)
  }, [pendingValidationSummaryFocus])

  function handleAddExercise(configuration: ExerciseConfiguration, instruction: string | null) {
    if (screen.type !== 'configureNew') {
      return
    }

    const exercise = createWorkoutExercise(
      screen.selection.type === 'library' ? screen.selection.combinationId : null,
      screen.selection.exerciseNameSnapshot,
      instruction,
      configuration,
    )

    dispatch({ type: 'addExercise', blockId: screen.blockId, exercise })
    setPendingAddedExerciseId(exercise.id)
    setScreen({ type: 'edit' })
  }

  function handleUpdateExercise(configuration: ExerciseConfiguration, instruction: string | null) {
    if (screen.type !== 'configureExisting') {
      return
    }

    dispatch({
      type: 'updateExercise',
      blockId: screen.blockId,
      exerciseId: screen.exerciseId,
      configuration,
      instruction,
    })
    setPendingAddedExerciseId(screen.exerciseId)
    setScreen({ type: 'edit' })
  }

  if (screen.type === 'preview') {
    return (
      <WorkoutPlanPreview
        ref={previewHeadingRef}
        state={state}
        displayPlanName={displayPlanName}
        onBack={backToEditFromPreview}
      />
    )
  }

  if (screen.type === 'library' || screen.type === 'configureNew' || screen.type === 'configureExisting') {
    const targetBlock = selectBlockById(state.draft.blocks, screen.blockId)
    const disciplineKey = state.draft.disciplineKey

    if (targetBlock && disciplineKey !== null) {
      if (screen.type === 'library') {
        return (
          <div className="flex flex-1 flex-col overflow-hidden">
            <ExerciseLibraryView
              blockType={targetBlock.blockType}
              disciplineKey={disciplineKey}
              libraryUiState={libraryUiState}
              onLibraryUiStateChange={setLibraryUiState}
              onBack={() => cancelExerciseLibrary(screen.blockId)}
              onConfigure={openExerciseConfiguration}
            />
          </div>
        )
      }

      if (screen.type === 'configureNew') {
        return (
          <div className="flex flex-1 flex-col overflow-hidden">
            <ExerciseConfigurationView
              blockLabel={getWorkoutBlockLabelPl(targetBlock.blockType)}
              exerciseName={screen.selection.exerciseNameSnapshot}
              initialConfiguration={selectInheritedExerciseConfiguration(targetBlock)}
              initialInstruction={null}
              variant="new"
              onBack={backToLibraryFromConfigureNew}
              onSubmit={handleAddExercise}
            />
          </div>
        )
      }

      const exercise = selectExerciseById(targetBlock, screen.exerciseId)

      if (exercise) {
        return (
          <div className="flex flex-1 flex-col overflow-hidden">
            <ExerciseConfigurationView
              blockLabel={getWorkoutBlockLabelPl(targetBlock.blockType)}
              exerciseName={exercise.exerciseNameSnapshot}
              initialConfiguration={copyExerciseConfiguration(exercise.configuration)}
              initialInstruction={exercise.instruction}
              variant="existing"
              onBack={() => cancelExerciseEdit(screen.exerciseId)}
              onSubmit={handleUpdateExercise}
            />
          </div>
        )
      }
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg px-4 py-6 md:max-w-2xl md:py-8">
          <Link
            to={routes.workouts}
            className="mb-6 inline-flex min-h-touch items-center gap-1 font-display text-[12px] font-semibold tracking-[0.04em] text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
          >
            <ChevronRightIcon className="rotate-180" />
            Wróć do treningów
          </Link>

          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
            Kreator treningu
          </p>
          <h1 className="mt-2 font-display text-[24px] font-bold text-ink md:text-[28px]">Nowy trening</h1>
          <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-muted">
            Ustal dyscyplinę i podstawowe informacje planu, a następnie buduj bloki, ćwiczenia i przerwy na osi
            treningu.
          </p>

          <div className="mt-8">
            <WorkoutMetadataForm state={state} dispatch={dispatch} />
          </div>

          <section aria-labelledby="workout-builder-display-name-heading" className="mt-8">
            <h2
              id="workout-builder-display-name-heading"
              className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-faint"
            >
              Aktualna nazwa planu
            </h2>
            <p className="mt-2 font-display text-[18px] font-semibold leading-snug text-ink md:text-[20px]">
              {displayPlanName}
            </p>
          </section>

          <RedAccent className="mt-8" />

          <WorkoutTimeline
            state={state}
            dispatch={dispatch}
            onOpenExerciseLibrary={openExerciseLibrary}
            onOpenExerciseEdit={openExerciseEdit}
            pendingAddedExerciseId={pendingAddedExerciseId}
            onPendingAddedExerciseFocusHandled={() => setPendingAddedExerciseId(null)}
            pendingAddExerciseBlockId={pendingAddExerciseBlockId}
            onPendingAddExerciseFocusHandled={() => setPendingAddExerciseBlockId(null)}
            pendingEditExerciseId={pendingEditExerciseId}
            onPendingEditExerciseFocusHandled={() => setPendingEditExerciseId(null)}
          />

          {validationIssues && validationIssues.length > 0 ? (
            <div className="mt-8">
              <WorkoutValidationSummary ref={validationSummaryRef} issues={validationIssues} />
            </div>
          ) : null}

          <div className="mt-8 pb-2">
            <button
              ref={previewButtonRef}
              type="button"
              onClick={handlePreviewPlan}
              className={getButtonClassName({
                variant: 'secondary',
                className:
                  'w-full focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--app-focus-ring)]',
              })}
            >
              Podgląd planu
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

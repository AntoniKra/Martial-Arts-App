import type { Dispatch } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { routes } from '@/app/routes'
import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon'
import { RedAccent } from '@/components/ui/RedAccent'
import type { ExerciseConfiguration } from '@/domain/workout/workout.types'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { ExerciseConfigurationView } from '@/features/workout-builder/components/ExerciseConfigurationView'
import { ExerciseLibraryView } from '@/features/workout-builder/components/ExerciseLibraryView'
import { WorkoutMetadataForm } from '@/features/workout-builder/components/WorkoutMetadataForm'
import { WorkoutTimeline } from '@/features/workout-builder/components/WorkoutTimeline'
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
        </div>
      </div>
    </div>
  )
}

import type { Dispatch, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { screenBackTarget } from '@/components/screenBackTarget'

import type { WorkoutPlanRepository } from '@/application/workout/workoutPlanRepository'
import { routes } from '@/app/routes'
import { Button } from '@/components/ui/Button'
import { finalizeWorkoutPlan } from '@/domain/workout/finalizeWorkoutPlan'
import type { ExerciseConfiguration, WorkoutPlan } from '@/domain/workout/workout.types'
import { validateWorkoutPlanDraft, type WorkoutPlanValidationIssue } from '@/domain/workout/workoutValidation'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { calculateEstimatedTotalSeconds } from '@/domain/workout/workoutCalculations'
import { ExerciseConfigurationView } from '@/features/workout-builder/components/ExerciseConfigurationView'
import { ExerciseLibraryView } from '@/features/workout-builder/components/ExerciseLibraryView'
import { UnsavedPlanChangesGuard } from '@/features/workout-builder/components/UnsavedPlanChangesGuard'
import { WorkoutMetadataForm } from '@/features/workout-builder/components/WorkoutMetadataForm'
import { WorkoutBuilderHeader } from '@/features/workout-builder/components/WorkoutBuilderHeader'
import { WorkoutPlanCard } from '@/features/workout-builder/components/WorkoutPlanCard'
import { WorkoutPlanPreview } from '@/features/workout-builder/components/WorkoutPlanPreview'
import { WorkoutTimeline } from '@/features/workout-builder/components/WorkoutTimeline'
import { WorkoutValidationSummary } from '@/features/workout-builder/components/WorkoutValidationSummary'
import type {
  ExerciseLibraryUiState,
  ExerciseSelection,
  WorkoutBuilderScreen,
  WorkoutPlanSaveState,
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
  selectStartingExerciseConfiguration,
} from '@/features/workout-builder/state/workoutBuilder.selectors'
import { copyExerciseConfiguration } from '@/features/workout-builder/utils/exerciseConfigurationCompare'
import { mapWorkoutPlanSaveError } from '@/features/workout-builder/utils/workoutPlanSaveErrorMessages'
import { workoutBuilderLabels } from '@/features/workout-builder/workoutBuilderLabels'
import { workoutPlanLabels } from '@/features/workouts/workoutPlanLabels'
import { exerciseLabels } from '@/features/exercises/exerciseLabels'
import { useWorkoutData } from '@/application/workoutDataContext'
import './workoutTimeline.css'

interface WorkoutBuilderViewProps {
  state: WorkoutBuilderState
  dispatch: Dispatch<WorkoutBuilderAction>
  workoutPlanRepository: WorkoutPlanRepository
  onPlanSaved: (plan: WorkoutPlan) => void
  editingPlanId?: string
}

const initialLibraryUiState: ExerciseLibraryUiState = {
  tab: 'library',
  searchQuery: '',
  customName: '',
}

export function WorkoutBuilderView({
  state,
  dispatch,
  workoutPlanRepository,
  onPlanSaved,
  editingPlanId,
}: WorkoutBuilderViewProps) {
  const { focusSkills, exercises, exerciseRepository } = useWorkoutData()
  const [addingExercise, setAddingExercise] = useState(false)
  const [exerciseSaveError, setExerciseSaveError] = useState<string | null>(null)
  const addingExerciseRef = useRef(false)
  const navigate = useNavigate()
  // A new plan starts on its details, so the discipline is chosen before the first block.
  const [screen, setScreen] = useState<WorkoutBuilderScreen>(() => (editingPlanId ? { type: 'edit' } : { type: 'planDetails' }))
  const [libraryUiState, setLibraryUiState] = useState<ExerciseLibraryUiState>(initialLibraryUiState)
  const [pendingAddedExerciseId, setPendingAddedExerciseId] = useState<string | null>(null)
  const [pendingAddExerciseBlockId, setPendingAddExerciseBlockId] = useState<string | null>(null)
  const [pendingEditExerciseId, setPendingEditExerciseId] = useState<string | null>(null)
  const [validationIssues, setValidationIssues] = useState<WorkoutPlanValidationIssue[] | null>(null)
  const [saveState, setSaveState] = useState<WorkoutPlanSaveState>({ status: 'idle' })
  const [pendingPreviewHeadingFocus, setPendingPreviewHeadingFocus] = useState(false)
  const [pendingPreviewButtonFocus, setPendingPreviewButtonFocus] = useState(false)
  const [pendingValidationSummaryFocus, setPendingValidationSummaryFocus] = useState(false)
  const [pendingSaveErrorFocus, setPendingSaveErrorFocus] = useState(false)
  const [pendingPlanCardFocus, setPendingPlanCardFocus] = useState(false)

  const previewButtonRef = useRef<HTMLButtonElement>(null)
  const previewHeadingRef = useRef<HTMLHeadingElement>(null)
  const validationSummaryRef = useRef<HTMLDivElement>(null)
  const saveErrorRef = useRef<HTMLDivElement>(null)
  const planCardRef = useRef<HTMLButtonElement>(null)
  const saveInFlightRef = useRef(false)
  const allowLeaveRef = useRef(false)

  const displayPlanName = selectDisplayPlanName(state)

  function closeBuilder() {
    const target = screenBackTarget(window.history.state, editingPlanId ? routes.workoutDetails(editingPlanId) : routes.workouts)
    if (typeof target === 'number') void navigate(target)
    else void navigate(target)
  }

  function closePlanDetails() {
    setScreen({ type: 'edit' })
    setPendingPlanCardFocus(true)
  }

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

    setExerciseSaveError(null)
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
    const result = validateWorkoutPlanDraft(state.draft, focusSkills.items)

    if (result.isValid) {
      setValidationIssues(null)
      setSaveState({ status: 'idle' })
      setScreen({ type: 'preview' })
      setPendingPreviewHeadingFocus(true)
      return
    }

    setValidationIssues(result.issues)
    setPendingValidationSummaryFocus(true)
  }

  function backToEditFromPreview() {
    if (saveState.status === 'saving') {
      return
    }

    setScreen({ type: 'edit' })
    setPendingPreviewButtonFocus(true)
  }

  async function handleSavePlan() {
    if (saveInFlightRef.current || saveState.status === 'saving') {
      return
    }

    saveInFlightRef.current = true
    setSaveState({ status: 'saving' })

    const finalized = finalizeWorkoutPlan(state.draft, focusSkills.items)

    if (!finalized.ok) {
      saveInFlightRef.current = false
      setSaveState({ status: 'idle' })
      setValidationIssues(finalized.validation.issues)
      setScreen({ type: 'edit' })
      setPendingValidationSummaryFocus(true)
      return
    }

    try {
      await workoutPlanRepository.save(finalized.plan)
      allowLeaveRef.current = true
      onPlanSaved(finalized.plan)
    } catch (error) {
      saveInFlightRef.current = false
      setSaveState({
        status: 'error',
        message: mapWorkoutPlanSaveError(error),
      })
      setPendingSaveErrorFocus(true)
    }
  }

  const [validatedDraft, setValidatedDraft] = useState(state.draft)
  if (validatedDraft !== state.draft) {
    setValidatedDraft(state.draft)
    setValidationIssues(null)
  }

  if (screen.type === 'library' || screen.type === 'configureNew' || screen.type === 'configureExisting') {
    const block = selectBlockById(state.draft.blocks, screen.blockId)
    if (!block || state.draft.disciplineKey === null
      || (screen.type === 'configureExisting' && !selectExerciseById(block, screen.exerciseId))) {
      setScreen({ type: 'edit' })
    }
  }

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

  useEffect(() => {
    if (!pendingPlanCardFocus) {
      return
    }

    const frame = requestAnimationFrame(() => {
      planCardRef.current?.focus()
      setPendingPlanCardFocus(false)
    })

    return () => cancelAnimationFrame(frame)
  }, [pendingPlanCardFocus])

  useEffect(() => {
    if (!pendingSaveErrorFocus) {
      return
    }

    const frame = requestAnimationFrame(() => {
      saveErrorRef.current?.focus()
      setPendingSaveErrorFocus(false)
    })

    return () => cancelAnimationFrame(frame)
  }, [pendingSaveErrorFocus])

  function guard(content: ReactNode) {
    return (
      <UnsavedPlanChangesGuard isDirty={state.isDirty} allowLeaveRef={allowLeaveRef}>
        {content}
      </UnsavedPlanChangesGuard>
    )
  }

  async function handleSaveChanges() {
    if (!editingPlanId || !state.isDirty || saveInFlightRef.current || saveState.status === 'saving') {
      return
    }

    const result = validateWorkoutPlanDraft(state.draft, focusSkills.items)

    if (!result.isValid) {
      setSaveState({ status: 'idle' })
      setValidationIssues(result.issues)
      setPendingValidationSummaryFocus(true)
      return
    }

    setValidationIssues(null)
    await handleSavePlan()
  }

  async function handleAddExercise(configuration: ExerciseConfiguration, instruction: string | null) {
    if (screen.type !== 'configureNew' || addingExerciseRef.current) {
      return
    }
    addingExerciseRef.current = true
    setAddingExercise(true)
    setExerciseSaveError(null)
    try {
      const selection = screen.selection
      let combinationId = selection.type === 'library' ? selection.combinationId : null
      const now = new Date().toISOString()
      if (selection.type === 'custom' && selection.saveToLibrary) {
        const block = selectBlockById(state.draft.blocks, screen.blockId)
        if (!block || !state.draft.disciplineKey || !selection.personalId) throw new Error('Exercise context missing')
        combinationId = selection.personalId
        await exerciseRepository.save({ id: combinationId, namePl: selection.exerciseNameSnapshot, type: selection.exerciseType ?? 'drill',
          disciplines: [state.draft.disciplineKey], blockTypes: [block.blockType], defaultConfiguration: { ...configuration },
          archivedAt: null, favorite: false, lastUsedAt: now, createdAt: now, updatedAt: now })
      } else if (combinationId) {
        const personal = exercises.items.find((exercise) => exercise.id === combinationId)
        if (personal) {
          if (personal.archivedAt !== null) throw new Error('Exercise archived')
          await exerciseRepository.markUsed(personal.id, now)
        }
      }
      const exercise = createWorkoutExercise(
        combinationId,
        screen.selection.exerciseNameSnapshot,
        instruction,
        configuration,
      )

      dispatch({ type: 'addExercise', blockId: screen.blockId, exercise })
      setPendingAddedExerciseId(exercise.id)
      setScreen({ type: 'edit' })
    } catch { setExerciseSaveError(exerciseLabels.error) }
    finally { addingExerciseRef.current = false; setAddingExercise(false) }
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
    return guard(
      <WorkoutPlanPreview
        ref={previewHeadingRef}
        state={state}
        displayPlanName={displayPlanName}
        saveState={saveState}
        saveErrorRef={saveErrorRef}
        onBack={backToEditFromPreview}
        onSave={handleSavePlan}
      />,
    )
  }

  if (screen.type === 'planDetails') {
    return guard(
      <div className="wb-builder flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-7 pt-3 md:max-w-2xl md:pt-6">
            <WorkoutBuilderHeader title={workoutBuilderLabels.planDetailsTitle} onClose={closePlanDetails} />
            <WorkoutMetadataForm state={state} dispatch={dispatch} />
          </div>
        </div>
      </div>,
    )
  }

  if (screen.type === 'library' || screen.type === 'configureNew' || screen.type === 'configureExisting') {
    const targetBlock = selectBlockById(state.draft.blocks, screen.blockId)
    const disciplineKey = state.draft.disciplineKey

    if (targetBlock && disciplineKey !== null) {
      if (screen.type === 'library') {
        return guard(
          <div className="flex flex-1 flex-col overflow-hidden">
            <ExerciseLibraryView
              blockType={targetBlock.blockType}
              disciplineKey={disciplineKey}
              libraryUiState={libraryUiState}
              onLibraryUiStateChange={setLibraryUiState}
              onBack={() => cancelExerciseLibrary(screen.blockId)}
              onConfigure={openExerciseConfiguration}
            />
          </div>,
        )
      }

      if (screen.type === 'configureNew') {
        const starting = selectStartingExerciseConfiguration(state.draft.blocks, targetBlock.id)

        return guard(
          <div className="flex flex-1 flex-col overflow-hidden">
            <ExerciseConfigurationView
              blockLabel={getWorkoutBlockLabelPl(targetBlock.blockType)}
              exerciseName={screen.selection.exerciseNameSnapshot}
              initialConfiguration={
                screen.selection.type === 'library' && screen.selection.defaultConfiguration ? { ...screen.selection.defaultConfiguration } : starting.mode === 'continuous'
                  ? { mode: 'continuous', durationSeconds: starting.continuousDurationSeconds }
                  : {
                      mode: 'rounds',
                      roundCount: starting.roundCount,
                      roundDurationSeconds: starting.roundDurationSeconds,
                      restBetweenRoundsSeconds: starting.restBetweenRoundsSeconds,
                    }
              }
              initialRoundSettings={starting}
              initialInstruction={null}
              variant="new"
              submitPending={addingExercise}
              submitError={exerciseSaveError}
              onBack={backToLibraryFromConfigureNew}
              onSubmit={(configuration, instruction) => void handleAddExercise(configuration, instruction)}
            />
          </div>,
        )
      }

      const exercise = selectExerciseById(targetBlock, screen.exerciseId)

      if (exercise) {
        return guard(
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
          </div>,
        )
      }
    }
  }

  const isSaving = saveState.status === 'saving'
  const saveErrorMessage = saveState.status === 'error' ? saveState.message : null

  const canPreview = state.draft.blocks.length > 0

  return guard(
    <div className="wb-builder flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-7 pt-3 md:max-w-2xl md:pt-6">
          <WorkoutBuilderHeader
            title={editingPlanId ? workoutPlanLabels.editHeading : workoutBuilderLabels.newWorkoutTitle}
            onClose={closeBuilder}
            closeDisabled={isSaving}
            action={(
              <button
                ref={previewButtonRef}
                type="button"
                disabled={isSaving || !canPreview}
                onClick={handlePreviewPlan}
                className="wb-header-action wb-focusable"
              >
                {workoutBuilderLabels.preview}
              </button>
            )}
          />

          <div className="flex flex-col gap-[14px]">
            <WorkoutPlanCard
              buttonRef={planCardRef}
              disciplineKey={state.draft.disciplineKey}
              planName={displayPlanName}
              mainGoal={state.draft.mainGoal}
              totalSeconds={calculateEstimatedTotalSeconds(state.draft)}
              onOpen={() => setScreen({ type: 'planDetails' })}
            />

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
              <WorkoutValidationSummary ref={validationSummaryRef} issues={validationIssues} />
            ) : null}

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

            {editingPlanId ? (
              <Button
                type="button"
                variant="primary"
                className="w-full"
                loading={isSaving}
                disabled={!state.isDirty || isSaving}
                onClick={() => {
                  void handleSaveChanges()
                }}
              >
                {isSaving ? workoutBuilderLabels.saving : workoutBuilderLabels.saveChanges}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
  )
}

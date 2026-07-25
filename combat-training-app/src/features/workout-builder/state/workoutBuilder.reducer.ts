import type { WorkoutBuilderAction, WorkoutBuilderState } from '@/features/workout-builder/state/workoutBuilder.types'

export function createInitialWorkoutBuilderState(): WorkoutBuilderState {
  return {
    draft: {
      id: crypto.randomUUID(),
      disciplineKey: null,
      customName: null,
      mainGoal: null,
      blocks: [],
      createdAt: new Date().toISOString(),
    },
    disciplineLocked: false,
    isDirty: false,
  }
}

export function workoutBuilderReducer(
  state: WorkoutBuilderState,
  action: WorkoutBuilderAction,
): WorkoutBuilderState {
  switch (action.type) {
    case 'setDiscipline': {
      if (state.disciplineLocked) {
        return state
      }

      if (state.draft.disciplineKey === action.disciplineKey) {
        return state
      }

      return {
        ...state,
        draft: {
          ...state.draft,
          disciplineKey: action.disciplineKey,
        },
        isDirty: true,
      }
    }
    case 'setCustomName': {
      if (state.draft.customName === action.customName) {
        return state
      }

      return {
        ...state,
        draft: {
          ...state.draft,
          customName: action.customName,
        },
        isDirty: true,
      }
    }
    case 'setMainGoal': {
      if (state.draft.mainGoal === action.mainGoal) {
        return state
      }

      return {
        ...state,
        draft: {
          ...state.draft,
          mainGoal: action.mainGoal,
        },
        isDirty: true,
      }
    }
    default:
      return state
  }
}

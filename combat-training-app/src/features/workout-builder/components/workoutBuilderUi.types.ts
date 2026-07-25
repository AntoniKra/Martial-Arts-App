export type ActiveInlinePanel =
  | {
      type: 'addBreak'
      blockId: string
    }
  | {
      type: 'editBreak'
      blockId: string
      itemId: string
    }
  | {
      type: 'confirmBlockDelete'
      blockId: string
      itemCountAtOpen: number
    }
  | null

export type FocusRestoreTarget =
  | {
      type: 'addBlock'
    }
  | {
      type: 'addBreak'
      blockId: string
    }
  | {
      type: 'addExercise'
      blockId: string
    }
  | {
      type: 'editBreak'
      itemId: string
    }
  | {
      type: 'addedExercise'
      exerciseId: string
    }

export type ExerciseLibraryTab = 'library' | 'custom'

export interface ExerciseLibraryUiState {
  tab: ExerciseLibraryTab
  searchQuery: string
  customName: string
}

export type ExerciseSelection =
  | {
      type: 'library'
      combinationId: string
      exerciseNameSnapshot: string
    }
  | {
      type: 'custom'
      exerciseNameSnapshot: string
    }

export type WorkoutBuilderScreen =
  | {
      type: 'edit'
    }
  | {
      type: 'library'
      blockId: string
    }
  | {
      type: 'configure'
      blockId: string
      selection: ExerciseSelection
    }

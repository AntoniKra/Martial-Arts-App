import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type {
  ExerciseConfiguration,
  WorkoutBlock,
  WorkoutBreak,
  WorkoutExercise,
  WorkoutPlanDraft,
} from '@/domain/workout/workout.types'

export interface WorkoutBuilderState {
  draft: WorkoutPlanDraft
  disciplineLocked: boolean
  isDirty: boolean
}

export type WorkoutBuilderAction =
  | { type: 'setDiscipline'; disciplineKey: DisciplineKey }
  | { type: 'setCustomName'; customName: string | null }
  | { type: 'setMainGoal'; mainGoal: string | null }
  | { type: 'addBlock'; block: WorkoutBlock }
  | { type: 'removeBlock'; blockId: string }
  | { type: 'moveBlock'; blockId: string; direction: 'up' | 'down' }
  | { type: 'addBreak'; blockId: string; breakItem: WorkoutBreak }
  | {
      type: 'updateBreak'
      blockId: string
      breakId: string
      durationSeconds: number
      instruction: string | null
    }
  | { type: 'addExercise'; blockId: string; exercise: WorkoutExercise }
  | { type: 'removeItem'; blockId: string; itemId: string }
  | { type: 'moveItem'; blockId: string; itemId: string; direction: 'up' | 'down' }

export const CUSTOM_NAME_MAX_LENGTH = 80
export const MAIN_GOAL_MAX_LENGTH = 240
export const BREAK_INSTRUCTION_MAX_LENGTH = 120
export const EXERCISE_NAME_MAX_LENGTH = 100
export const EXERCISE_INSTRUCTION_MAX_LENGTH = 240
export const ROUND_COUNT_MAX = 99

export const DEFAULT_ROUND_EXERCISE_CONFIGURATION = {
  mode: 'rounds',
  roundCount: 3,
  roundDurationSeconds: 180,
  restBetweenRoundsSeconds: 60,
} as const satisfies ExerciseConfiguration

export const WORKOUT_BUILDER_DISCIPLINE_KEYS = [
  'boxing',
  'kickboxing',
  'muay_thai',
  'k1',
  'mma_striking',
] as const satisfies readonly DisciplineKey[]

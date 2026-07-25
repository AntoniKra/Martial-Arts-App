import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { WorkoutPlanDraft } from '@/domain/workout/workout.types'

export interface WorkoutBuilderState {
  draft: WorkoutPlanDraft
  disciplineLocked: boolean
  isDirty: boolean
}

export type WorkoutBuilderAction =
  | { type: 'setDiscipline'; disciplineKey: DisciplineKey }
  | { type: 'setCustomName'; customName: string | null }
  | { type: 'setMainGoal'; mainGoal: string | null }

export const CUSTOM_NAME_MAX_LENGTH = 80
export const MAIN_GOAL_MAX_LENGTH = 240

export const WORKOUT_BUILDER_DISCIPLINE_KEYS = [
  'boxing',
  'kickboxing',
  'muay_thai',
  'k1',
  'mma_striking',
] as const satisfies readonly DisciplineKey[]

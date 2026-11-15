import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { ExerciseType } from '@/domain/exercise/exercise'
import type { ExerciseConfiguration, WorkoutBlockType } from '@/domain/workout/workout.types'

export interface Combination {
  id: string
  combinationKey: string
  namePl: string
  nameEn: string | null
  type: ExerciseType
  category: string
  defaultConfiguration: ExerciseConfiguration
  disciplineKeys: DisciplineKey[]
  blockTypes: WorkoutBlockType[]
  isSystem: boolean
  isActive: boolean
}

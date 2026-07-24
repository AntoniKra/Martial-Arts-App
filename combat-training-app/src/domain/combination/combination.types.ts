import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { WorkoutBlockType } from '@/domain/workout/workout.types'

export interface Combination {
  id: string
  key: string
  namePl: string
  nameEn: string | null
  disciplineKeys: DisciplineKey[]
  blockTypes: WorkoutBlockType[]
  isSystem: boolean
  isActive: boolean
}

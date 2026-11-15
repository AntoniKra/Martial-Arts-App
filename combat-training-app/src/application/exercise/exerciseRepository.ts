import type { SubscribableRepository } from '@/application/repositorySubscription'
import type { PersonalExercise } from '@/domain/exercise/exercise'

export interface ExerciseRepository extends SubscribableRepository<PersonalExercise> {
  save(exercise: PersonalExercise): Promise<void>
  markUsed(id: string, at: string): Promise<void>
  setFavorite(id: string, favorite: boolean, at: string): Promise<void>
  setArchived(id: string, archivedAt: string | null, at: string): Promise<void>
  deleteUnused(id: string): Promise<void>
}

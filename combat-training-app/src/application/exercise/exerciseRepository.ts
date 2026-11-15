import type { SubscribableRepository } from '@/application/repositorySubscription'
import type { PersonalExercise } from '@/domain/exercise/exercise'

export interface ExerciseRepository extends SubscribableRepository<PersonalExercise> {
  save(exercise: PersonalExercise): Promise<void>
  deleteUnused(id: string): Promise<void>
}

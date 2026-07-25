import {
  WorkoutPlanStorageError,
  type WorkoutPlanStorageErrorCode,
} from '@/infrastructure/storage/workoutPlanStorageSchema'

const WORKOUT_PLAN_LIST_LOAD_ERROR_MESSAGES_PL: Record<WorkoutPlanStorageErrorCode, string> = {
  read_failed: 'Nie udało się odczytać zapisanych planów z pamięci przeglądarki.',
  write_failed: 'Nie udało się wczytać planów z pamięci przeglądarki.',
  invalid_json: 'Nie można wczytać planów, ponieważ zapisane wcześniej dane są uszkodzone.',
  invalid_data: 'Nie można wczytać planów, ponieważ dane planów są niepoprawne.',
  unsupported_schema_version: 'Zapisane plany pochodzą z nieobsługiwanej wersji aplikacji.',
}

const UNKNOWN_LIST_LOAD_ERROR_MESSAGE_PL = 'Nie udało się wczytać planów. Spróbuj ponownie.'

export function mapWorkoutPlanListLoadError(error: unknown): string {
  if (error instanceof WorkoutPlanStorageError) {
    return WORKOUT_PLAN_LIST_LOAD_ERROR_MESSAGES_PL[error.code]
  }

  return UNKNOWN_LIST_LOAD_ERROR_MESSAGE_PL
}

import {
  WorkoutPlanStorageError,
  type WorkoutPlanStorageErrorCode,
} from '@/infrastructure/storage/workoutPlanStorageSchema'

const WORKOUT_PLAN_SAVE_ERROR_MESSAGES_PL: Record<WorkoutPlanStorageErrorCode, string> = {
  read_failed: 'Nie udało się odczytać zapisanych planów z pamięci przeglądarki.',
  write_failed:
    'Nie udało się zapisać planu w pamięci przeglądarki. Sprawdź dostępne miejsce i spróbuj ponownie.',
  invalid_json: 'Nie można zapisać planu, ponieważ zapisane wcześniej dane są uszkodzone.',
  invalid_data: 'Nie można zapisać planu, ponieważ dane planów są niepoprawne.',
  unsupported_schema_version: 'Zapisane plany pochodzą z nieobsługiwanej wersji aplikacji.',
}

const UNKNOWN_SAVE_ERROR_MESSAGE_PL = 'Nie udało się zapisać planu. Spróbuj ponownie.'

export function mapWorkoutPlanSaveError(error: unknown): string {
  if (error instanceof WorkoutPlanStorageError) {
    return WORKOUT_PLAN_SAVE_ERROR_MESSAGES_PL[error.code]
  }

  return UNKNOWN_SAVE_ERROR_MESSAGE_PL
}

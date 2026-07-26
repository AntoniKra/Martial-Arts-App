import {
  WorkoutSessionStorageError,
  type WorkoutSessionStorageErrorCode,
} from '@/infrastructure/storage/workoutSessionStorageSchema'

const WORKOUT_SESSION_LIST_LOAD_ERROR_MESSAGES_PL: Record<WorkoutSessionStorageErrorCode, string> = {
  read_failed: 'Nie udało się odczytać zapisanych treningów z pamięci przeglądarki.',
  write_failed: 'Nie udało się wczytać historii treningów z pamięci przeglądarki.',
  invalid_json: 'Nie można wczytać historii, ponieważ zapisane wcześniej dane są uszkodzone.',
  invalid_data: 'Nie można wczytać historii, ponieważ dane treningów są niepoprawne.',
  unsupported_schema_version: 'Zapisane treningi pochodzą z nieobsługiwanej wersji aplikacji.',
}

const UNKNOWN_LIST_LOAD_ERROR_MESSAGE_PL =
  'Nie udało się wczytać historii treningów. Spróbuj ponownie.'

export function mapWorkoutSessionListLoadError(error: unknown): string {
  if (error instanceof WorkoutSessionStorageError) {
    return WORKOUT_SESSION_LIST_LOAD_ERROR_MESSAGES_PL[error.code]
  }

  return UNKNOWN_LIST_LOAD_ERROR_MESSAGE_PL
}

import {
  WorkoutSessionStorageError,
  type WorkoutSessionStorageErrorCode,
} from '@/infrastructure/storage/workoutSessionStorageSchema'

const WORKOUT_SESSION_SAVE_ERROR_MESSAGES_PL: Record<WorkoutSessionStorageErrorCode, string> = {
  read_failed: 'Nie udało się odczytać zapisanych treningów z pamięci przeglądarki.',
  write_failed:
    'Nie udało się zapisać treningu w pamięci przeglądarki. Sprawdź dostępne miejsce i spróbuj ponownie.',
  invalid_json: 'Nie można zapisać treningu, ponieważ zapisane wcześniej dane są uszkodzone.',
  invalid_data: 'Nie można zapisać treningu, ponieważ dane treningów są niepoprawne.',
  unsupported_schema_version: 'Zapisane treningi pochodzą z nieobsługiwanej wersji aplikacji.',
}

const UNKNOWN_SAVE_ERROR_MESSAGE_PL = 'Nie udało się zapisać treningu. Spróbuj ponownie.'

export function mapWorkoutSessionSaveError(error: unknown): string {
  if (error instanceof WorkoutSessionStorageError) {
    return WORKOUT_SESSION_SAVE_ERROR_MESSAGES_PL[error.code]
  }

  return UNKNOWN_SAVE_ERROR_MESSAGE_PL
}

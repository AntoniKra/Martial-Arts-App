import {
  WorkoutPlanStorageError,
  type WorkoutPlanStorageErrorCode,
} from '@/infrastructure/storage/workoutPlanStorageSchema'

const WORKOUT_PLAN_LIST_READ_ERROR_MESSAGES_PL: Record<WorkoutPlanStorageErrorCode, string> = {
  read_failed: 'Nie udało się odczytać zapisanych planów z pamięci przeglądarki.',
  write_failed: 'Nie udało się wczytać planów z pamięci przeglądarki.',
  invalid_json: 'Nie można wczytać planów, ponieważ zapisane wcześniej dane są uszkodzone.',
  invalid_data: 'Nie można wczytać planów, ponieważ dane planów są niepoprawne.',
  unsupported_schema_version: 'Zapisane plany pochodzą z nieobsługiwanej wersji aplikacji.',
}

const WORKOUT_PLAN_SINGLE_READ_ERROR_MESSAGES_PL: Record<WorkoutPlanStorageErrorCode, string> = {
  read_failed: 'Nie udało się odczytać planu z pamięci przeglądarki.',
  write_failed: 'Nie udało się wczytać planu z pamięci przeglądarki.',
  invalid_json: 'Nie można wczytać planu, ponieważ zapisane wcześniej dane są uszkodzone.',
  invalid_data: 'Nie można wczytać planu, ponieważ dane planów są niepoprawne.',
  unsupported_schema_version: 'Zapisany plan pochodzi z nieobsługiwanej wersji aplikacji.',
}

const UNKNOWN_LIST_READ_ERROR_MESSAGE_PL = 'Nie udało się wczytać planów. Spróbuj ponownie.'
const UNKNOWN_SINGLE_READ_ERROR_MESSAGE_PL = 'Nie udało się wczytać planu. Spróbuj ponownie.'

function mapWorkoutPlanStorageReadError(
  error: unknown,
  messages: Record<WorkoutPlanStorageErrorCode, string>,
  unknownMessage: string,
): string {
  if (error instanceof WorkoutPlanStorageError) {
    return messages[error.code]
  }

  return unknownMessage
}

export function mapWorkoutPlanReadError(error: unknown): string {
  return mapWorkoutPlanStorageReadError(
    error,
    WORKOUT_PLAN_SINGLE_READ_ERROR_MESSAGES_PL,
    UNKNOWN_SINGLE_READ_ERROR_MESSAGE_PL,
  )
}

export function mapWorkoutPlanListLoadError(error: unknown): string {
  return mapWorkoutPlanStorageReadError(
    error,
    WORKOUT_PLAN_LIST_READ_ERROR_MESSAGES_PL,
    UNKNOWN_LIST_READ_ERROR_MESSAGE_PL,
  )
}

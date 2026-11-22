import { MAX_WORKOUT_SESSION_STEPS } from '@/domain/workout-session/workoutSessionLimits'

export const workoutBuilderLabels = {
  backToWorkouts: 'Wróć do treningów',
  previewPlan: 'Podgląd planu',
  saveChanges: 'Zapisz zmiany',
  savePlan: 'Zapisz plan',
  saving: 'Zapisywanie…',
  saveFailed: 'Nie udało się zapisać planu',
  sessionStepLimitExceeded: (stepCount: number) =>
    `Plan ma za dużo etapów (${stepCount}). Maksimum to ${MAX_WORKOUT_SESSION_STEPS} – zmniejsz liczbę rund lub ćwiczeń.`,
  discardTitle: 'Odrzucić zmiany?',
  discardDescription: 'Zmiany w planie nie zostaną zapisane.',
  discardChanges: 'Odrzuć zmiany',
  returnToEditing: 'Wróć do edycji',
  restBetweenRounds: 'Przerwa między rundami',
  singleRoundRest:
    'Przy 1 rundzie nie ma przerwy między rundami. Przerwę po ćwiczeniu dodasz w bloku jako element „Przerwa”.',
} as const

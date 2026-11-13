import type { WorkoutSessionCategory } from '@/domain/workout-session/workoutSession.types'

export const manualWorkoutLabels = {
  add: '+ Dodaj trening spoza aplikacji', edit: 'Popraw', title: 'Trening spoza aplikacji',
  editTitle: 'Popraw trening spoza aplikacji', unavailable: 'Ten wpis można tylko usunąć.',
  missing: 'Nie znaleziono wpisu.', loading: 'Wczytywanie wpisu…', loadError: 'Nie udało się wczytać dziennika.',
  saveError: 'Nie udało się zapisać wpisu. Spróbuj ponownie.',
  date: 'Data', dateHint: 'Do 7 dni wstecz.', discipline: 'Dyscyplina', category: 'Rodzaj treningu',
  duration: 'Czas trwania', durationHint: 'Cały czas zajęć, razem z rozgrzewką.', customDuration: 'Inny', minutes: 'Czas w minutach',
  rpe: 'Wysiłek (RPE)', rpeHint: 'Oceń cały trening, nie ostatnią rundę.',
  recall: (days: number) => `Ten trening był ${days} dni temu. RPE dostanie znaczek „z pamięci”, bo ocena po kilku dniach jest mniej dokładna.`,
  sparring: 'Był sparing', intensity: 'Intensywność sparingu', rounds: 'Liczba rund (opcjonalnie)',
  focus: 'Ćwiczenia celu (opcjonalnie)', focusHint: 'Oceń do 3 ćwiczeń celu, nad którymi pracowałeś na tych zajęciach.',
  noSkills: 'Nie masz ćwiczeń celu. Dodasz je w kreatorze planu.', skillsError: 'Nie udało się wczytać ćwiczeń celu. Możesz zapisać resztę wpisu bez zmian w ocenach.',
  skillsLoading: 'Wczytywanie ćwiczeń celu…', place: 'Gdzie ćwiczyłeś?', choosePlace: 'Wybierz miejsce',
  newCorrection: '+ Dodaj notatkę „problem i poprawka”', retry: 'Spróbuj ponownie',
  save: 'Zapisz', cancel: 'Anuluj', back: 'Wróć do historii', discard: 'Zmiany we wpisie nie zostaną zapisane.',
  duplicateTitle: 'Masz już trening z tego dnia',
  duplicate: (name: string) => `Masz już trening „${name}” z tego dnia. To osobny trening?`,
  duplicateHint: 'Jeśli część zajęć zapisała aplikacja, wpisz tylko resztę, np. sam sparing.',
  confirmDuplicate: 'Tak, zapisz osobno', returnToEntry: 'Wróć do wpisu',
} as const

export const manualCategoryDescriptions: Record<WorkoutSessionCategory, string> = {
  technique: 'np. walka z cieniem, technika w parach', pads: 'np. rundy na tarczach z trenerem', bag: 'np. rundy na worku',
  sparring: 'np. sparing w klubie', conditioning: 'np. bieganie, skakanka, interwały',
  strengthAndConditioning: 'np. siłownia, ćwiczenia z obciążeniem', mixed: 'np. zajęcia w klubie z techniką, tarczami i sparingiem',
}

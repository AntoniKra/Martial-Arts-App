import { focusSkillLabels } from '@/features/focus-skills/focusSkillLabels'

export const progressLabels = {
  title: 'Postęp', skills: 'Ćwiczenia celu', archived: focusSkillLabels.archived, noRatings: 'Brak ocen',
  empty: 'Ćwiczenie celu oznaczysz w kreatorze przy ćwiczeniu. Po treningu możesz je ocenić, a tutaj zobaczysz swoje oceny.',
  newPlan: 'Nowy plan', loading: 'Ładowanie…', retry: 'Spróbuj ponownie', back: 'Wróć do listy',
  notFound: 'Nie znaleziono ćwiczenia celu', allRatings: 'Wszystkie oceny', summary: 'Podsumowanie ocen',
  chart: 'Oceny według daty treningu', lastWeeks: 'Ostatnie 12 tygodni',
  assessmentAxis: 'Ocena', dateAxis: 'Data treningu', placesLegend: 'Legenda miejsc',
  noActiveSkills: 'Brak aktywnych ćwiczeń celu',
  latest: (value: number | 'unableToRate', date: string, place: string) => `Ostatnia ocena: ${value} · ${formatProgressDate(date)} · ${place}`,
  previous: 'według poprzedniego kryterium', unable: 'Nie umiem ocenić', change: 'Zmiana kryterium',
  currentCount: (count: number) => `Oceny według obecnego kryterium: ${count}`,
  unableCount: (count: number) => `Nie umiem ocenić: ${count}`,
  previousCount: (count: number) => `Starsze oceny według poprzedniego kryterium nie są liczone (${count})`,
  single: (value: number, date: string) => `Jedna ocena: ${value} (${formatProgressDate(date, false)})`,
  pair: (values: number[]) => `Oceny: ${values.join(', ')}`,
  median: (value: number, count: number) => `Środkowa ocena: ${value.toLocaleString('pl-PL')} (z ${count} ocen)`,
  recent: (values: number[]) => `Ostatnie 3: ${values.join(', ')}`,
  earlier: (values: number[]) => `Wcześniejsze: ${values.join(', ')}`,
  oldPoint: 'Pusty punkt: poprzednie kryterium',
  invalid: 'Pominięto niepoprawne dokumenty. Część ocen może być niedostępna.',
} as const

export function formatProgressDate(date: string, year = true): string {
  const [y, m, d] = date.split('-')
  return year ? `${d}.${m}.${y}` : `${d}.${m}`
}

export const progressActionLabels = {
  archive: 'Schowaj ćwiczenie celu', delete: 'Usuń ćwiczenie celu', restore: 'Przywróć',
  archiveShort: 'Schowaj', archiveAndDetach: 'Schowaj i zdejmij CEL', deleteShort: 'Usuń', cancel: 'Anuluj',
  deleteQuestion: 'Usunąć ćwiczenie celu? Nie ma jeszcze ocen.',
  inPlans: 'To ćwiczenie celu jest w planach:',
  archivePlans: 'Po schowaniu zdejmiemy w nich oznaczenie CEL. Ćwiczenia zostaną w planach, a oceny i wykres zostaną w „Postępie”.',
  deletePlans: 'Po usunięciu zdejmiemy w nich oznaczenie CEL. Ćwiczenia zostaną w planach.',
  archiveUnused: 'Schowane ćwiczenie celu nie pojawi się w kreatorze. Oceny i wykres zostaną.',
  restoreHint: 'Ćwiczenie celu wróci do listy w kreatorze. Oznaczenie CEL w planach ustawisz ponownie w kreatorze.',
  error: 'Nie udało się zapisać zmiany. Spróbuj ponownie.',
  unavailable: 'Do tej operacji potrzebne są poprawnie wczytane plany, historia i ćwiczenia celu.',
  retry: progressLabels.retry,
} as const

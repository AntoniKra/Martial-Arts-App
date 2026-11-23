import { focusSkillLabels } from '@/features/focus-skills/focusSkillLabels'
import { actionLabels } from '@/components/ui/actionLabels'
import { workoutCountNoun } from '@/domain/workout/workoutCountLabels'

export const progressLabels = {
  tabs: 'Zakładki Postępu', charts: 'Wykresy', history: 'Historia',
  title: 'Postęp', skills: 'Elementy do poprawy', archived: focusSkillLabels.archived, noRatings: 'Brak ocen',
  empty: 'Dodaj jedną rzecz, nad którą pracujesz, np. ręka wraca do brody po jabie. Po treningu ocenisz, jak wyszła.',
  newPlan: 'Nowy plan', loading: 'Ładowanie…', retry: 'Spróbuj ponownie', back: 'Wróć do listy',
  notFound: 'Nie znaleziono elementu do poprawy', allRatings: 'Wszystkie oceny', summary: 'Podsumowanie ocen',
  chart: 'Oceny według daty treningu', lastWeeks: 'Ostatnie 12 tygodni',
  recentWeeks: 'Ostatnie tygodnie', chartMetric: 'Treningi w tygodniu',
  chartHint: 'Wykres pojawi się po 3 tygodniach',
  chartPlanUnavailable: 'Część planów tygodnia jest niedostępna.',
  weekPicker: 'Wybierz tydzień w Historii',
  currentWeekShort: 'ten tydz.', currentWeekCompact: 'ten',
  showMoreWeeks: (count: number) => `Pokaż ${count} tygodni`, showFewerWeeks: 'Pokaż mniej',
  weeksShown: (count: number) => `Pokazano ${count} tygodni`,
  weekDetails: (week: string, count: number, target: number | null, planKnown: boolean) =>
    `${week}: ${count} ${workoutCountNoun(count)}${target === null ? '' : `, plan ${target}`}${planKnown ? '' : ', plan niedostępny'}`,
  workoutCount: workoutCountNoun,
  plannedWorkouts: 'treningi (plan)',
  sparringWorkouts: (count: number) => `${count} ${workoutCountNoun(count)} ze sparingiem · 4 tyg.`,
  unknownRounds: (count: number) => `W ${count} ${workoutCountNoun(count, 'locative')} liczba rund nieznana.`,
  assessmentAxis: 'Ocena', dateAxis: 'Data treningu', placesLegend: 'Legenda miejsc',
  noActiveSkills: 'Brak aktywnych elementów do poprawy',
  notRatedYet: 'Jeszcze bez ocen', rateAfterWorkout: 'Ocenisz po najbliższym treningu',
  latest: (value: number | 'unableToRate', date: string, place: string) => `Ostatnia ocena: ${value} · ${formatProgressDate(date)} · ${place}`,
  previous: 'według poprzedniego celu', unable: 'Nie umiem ocenić', change: 'Zmiana celu',
  currentCount: (count: number) => `Oceny według obecnego celu: ${count}`,
  unableCount: (count: number) => `Nie umiem ocenić: ${count}`,
  previousCount: (count: number) => `Starsze oceny według poprzedniego celu nie są liczone (${count})`,
  single: (value: number, date: string) => `Jedna ocena: ${value} (${formatProgressDate(date, false)})`,
  pair: (values: number[]) => `Oceny: ${values.join(', ')}`,
  median: (value: number, count: number) => `Środkowa ocena: ${value.toLocaleString('pl-PL')} (z ${count} ocen)`,
  recent: (values: number[]) => `Ostatnie 3: ${values.join(', ')}`,
  earlier: (values: number[]) => `Wcześniejsze: ${values.join(', ')}`,
  oldPoint: 'Pusty punkt: poprzedni cel',
  invalid: 'Pominięto niepoprawne dokumenty. Część ocen może być niedostępna.',
} as const

export function formatProgressDate(date: string, year = true): string {
  const [y, m, d] = date.split('-')
  return year ? `${d}.${m}.${y}` : `${d}.${m}`
}

export const progressActionLabels = {
  archive: 'Schowaj element do poprawy', delete: 'Usuń element do poprawy', restore: 'Przywróć',
  archiveShort: 'Schowaj', archiveAndDetach: 'Schowaj i zdejmij CEL', deleteShort: 'Usuń', cancel: actionLabels.cancel,
  deleteQuestion: 'Usunąć element do poprawy? Nie ma jeszcze ocen.',
  inPlans: 'Ten element do poprawy jest w planach:',
  archivePlans: 'Po schowaniu zdejmiemy w nich oznaczenie CEL. Ćwiczenia zostaną w planach, a oceny i wykres zostaną w „Postępie”.',
  deletePlans: 'Po usunięciu zdejmiemy w nich oznaczenie CEL. Ćwiczenia zostaną w planach.',
  archiveUnused: 'Schowany element do poprawy nie pojawi się w kreatorze. Oceny i wykres zostaną.',
  restoreHint: 'Element do poprawy wróci do listy w kreatorze. Oznaczenie CEL w planach ustawisz ponownie w kreatorze.',
  error: 'Nie udało się zapisać zmiany. Spróbuj ponownie.',
  unavailable: 'Do tej operacji potrzebne są poprawnie wczytane plany, historia i elementy do poprawy.',
  retry: progressLabels.retry,
} as const

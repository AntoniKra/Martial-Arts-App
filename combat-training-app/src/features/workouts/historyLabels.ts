import { workoutCountNoun } from '@/domain/workout/workoutCountLabels'

export const historyLabels = {
  view: 'Widok historii', weeks: 'Tygodnie', month: 'Miesiąc', allWeeks: 'Wszystkie tygodnie',
  emptyWeek: 'Brak treningów w tym tygodniu.',
  noMatching: 'Brak pasujących wpisów',
  currentWeek: 'Ten tydzień',
  active: 'Aktywny',
  fullWeek: 'Cały tydzień',
  incomplete: 'Historia niepełna · podsumowanie niedostępne',
  gap: (weeks: number) => `przerwa ${weeks} ${weeks === 1 ? 'tydz.' : 'tyg.'} (0 ${workoutCountNoun(0)})`,
  totalTime: 'Łączny czas',
  plan: (percentage: number) => `Plan ${Math.round(percentage)}%`,
  calendar: 'Kalendarz treningów', previousMonth: 'Poprzedni miesiąc', nextMonth: 'Następny miesiąc',
  weekdays: ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'],
  dayCount: (date: string, count: number, sparring: boolean) => `${date}: ${count} ${workoutCountNoun(count)}${sparring ? ' · sparing' : ''}`,
  dayWorkouts: (date: string) => `Treningi ${date}`,
  emptyDay: 'Brak treningów tego dnia.',
  chooseDay: 'Wybierz dzień, aby zobaczyć wpisy.',
  emptyTitle: 'Brak historii treningów',
  emptyDescription: 'Nie zarejestrowano jeszcze żadnych jednostek treningowych. Zrealizuj swój pierwszy trening z planu lub dodaj wpis ręczny.',
  emptyMonth: 'Brak treningów w wybranym miesiącu.',
  addFirst: 'Dodaj pierwszy trening',
} as const

import { workoutCountNoun } from '@/domain/workout/workoutCountLabels'

export const historyLabels = {
  view: 'Widok historii', weeks: 'Tygodnie', month: 'Miesiąc', allWeeks: 'Wszystkie tygodnie',
  emptyWeek: 'Brak treningów w tym tygodniu.',
  noMatching: 'Brak pasujących wpisów',
  currentWeek: 'Ten tydzień',
  fullWeek: 'Cały tydzień',
  incomplete: 'Historia niepełna · podsumowanie niedostępne',
  gap: (weeks: number) => `przerwa${weeks === 1 ? '' : ` ${weeks} tyg.`} (0 ${workoutCountNoun(0)})`,
  weekSummary: (count: number, minutes: number) => `${count} ${workoutCountNoun(count)} · ${minutes} min`,
  plan: (credited: number, target: number) => `plan ${credited}/${target}`,
  calendar: 'Kalendarz treningów', previousMonth: 'Poprzedni miesiąc', nextMonth: 'Następny miesiąc',
  weekdays: ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'],
  dayCount: (date: string, count: number) => `${date}: ${count} ${workoutCountNoun(count)}`,
  dayWorkouts: (date: string) => `Treningi ${date}`,
  emptyDay: 'Brak treningów tego dnia.',
  chooseDay: 'Wybierz dzień, aby zobaczyć wpisy.',
} as const

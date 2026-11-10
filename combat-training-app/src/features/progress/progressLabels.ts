export const progressLabels = {
  title: 'Postęp', skills: 'Ćwiczenia celu', archived: 'Schowane', noRatings: 'Brak ocen',
  empty: 'Ćwiczenie celu oznaczysz w kreatorze przy ćwiczeniu. Po treningu możesz je ocenić, a tutaj zobaczysz swoje oceny.',
  newPlan: 'Nowy plan', loading: 'Ładowanie…', retry: 'Spróbuj ponownie', back: 'Wróć do listy',
  notFound: 'Nie znaleziono ćwiczenia celu', allRatings: 'Wszystkie oceny', summary: 'Podsumowanie ocen',
  chart: 'Oceny według daty treningu', lastWeeks: 'Ostatnie 12 tygodni',
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

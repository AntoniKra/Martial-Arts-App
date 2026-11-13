import type { WeeklySummary } from '@/domain/weekly-summary/weeklySummary'

export const weeklySummaryLabels = {
  title: 'Podsumowanie treningów',
  workouts: 'Treningi',
  completed: 'Ukończone',
  partial: 'Częściowe',
  duration: 'Czas treningu',
  durationHint: 'Z odpoczynkami, bez pauz.',
  work: 'Czas pracy',
  recordedWork: 'Zarejestrowany czas pracy',
  sparring: 'Czas sparingu',
  recordedSparring: 'Zarejestrowany czas sparingu',
  hardRounds: 'Twarde rundy sparingu',
  intensityCoverage: (known: number, total: number) => `Intensywność znana w ${known} z ${total} treningów ze sparingiem`,
  hardRoundsUnknown: (count: number) => `Twardy sparing bez liczby rund w ${count} treningach. Rund bez podanej liczby nie doliczamy.`,
  load: 'Obciążenie tygodnia',
  recordedLoad: 'Zarejestrowane obciążenie',
  loadHint: 'Jednostki umowne: minuty treningu × RPE',
  loadPartial: 'Suma obejmuje tylko treningi z RPE.',
  loadDuration: 'Czas treningów z RPE',
  loadDetails: 'Szczegóły obciążenia',
  sessionRpe: 'RPE',
  sessionLoad: 'Obciążenie',
  noRpe: 'Brak RPE',
  noLoad: 'Brak obciążenia',
  noData: 'Brak danych',
  comparison: 'Na tle 3 poprzednich tygodni',
  comparisonMetric: 'Miara',
  currentWeek: 'Ten tydzień',
  currentWeekOngoing: 'Ten tydzień (trwa)',
  typicalWeek: 'Zwykle',
  incompleteLoad: 'Brak pełnych danych',
  comparisonUnavailable: 'Porównanie pojawi się po 3 pełnych tygodniach treningów.',
  comparisonHint: 'Zwykle = średnia z 3 tygodni przed tym tygodniem. Tygodnie bez treningów liczą się jako 0. To opis, nie ocena.',
  empty: 'Brak treningów w tym tygodniu',
  loading: 'Wczytywanie podsumowania treningów…',
  error: 'Nie udało się wczytać treningów do podsumowania.',
  incomplete: 'Historia treningów jest niepełna. Podsumowanie będzie dostępne po odczytaniu wszystkich wpisów.',
  retry: 'Ponów odczyt podsumowania',
  chart: 'Ostatnie 12 tygodni',
  minutes: 'Minuty',
  metric: 'Miara wykresu',
  inProgress: 'trwa',
  selectedWeek: 'wybrany',
  showData: 'Pokaż dane',
  week: 'Tydzień',
  chartHint: 'Daty poniedziałków. Obrys kolumny oznacza wybrany tydzień; pusty słupek i „trwa” — bieżący.',
  chartDescription: (metric: string) => `Wykres słupkowy 12 tygodni. ${metric}, oś od zera. Tydzień bez treningu ma wartość 0. Bieżący tydzień trwa. Pełne wartości w tabeli „Pokaż dane”.`,
  coverage: (known: number, total: number) => `Dane w ${known} z ${total} treningów`,
  rpe: (known: number, total: number) => `RPE w ${known} z ${total} treningów`,
} as const

const loadFormatter = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 })
const workoutCountFormatter = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function formatTypicalWorkoutCountPl(count: number): string {
  return workoutCountFormatter.format(count)
}

export function formatWeeklyLoadPl({ workoutCount, load }: WeeklySummary): string {
  return workoutCount === 0 ? formatTrainingLoadPl(0) : load.units === null ? weeklySummaryLabels.noData : formatTrainingLoadPl(load.units)
}

export function formatComparisonLoadPl(summary: WeeklySummary): string {
  const value = formatWeeklyLoadPl(summary)
  const missing = summary.workoutCount - summary.load.knownCount
  return missing > 0 && summary.load.knownCount > 0 ? `${value} (bez RPE: ${missing})` : value
}

export function formatTrainingLoadPl(units: number): string {
  return `${loadFormatter.format(units)} j.u.`
}

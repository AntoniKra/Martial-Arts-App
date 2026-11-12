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
  empty: 'Brak treningów w tym tygodniu',
  loading: 'Wczytywanie podsumowania treningów…',
  error: 'Nie udało się wczytać treningów do podsumowania.',
  incomplete: 'Historia treningów jest niepełna. Podsumowanie będzie dostępne po odczytaniu wszystkich wpisów.',
  retry: 'Ponów odczyt podsumowania',
  coverage: (known: number, total: number) => `Dane w ${known} z ${total} treningów`,
  rpe: (known: number, total: number) => `RPE w ${known} z ${total} treningów`,
} as const

const loadFormatter = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 })

export function formatTrainingLoadPl(units: number): string {
  return `${loadFormatter.format(units)} j.u.`
}

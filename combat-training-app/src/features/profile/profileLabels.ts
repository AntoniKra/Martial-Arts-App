import { calculateWorkoutDate } from '@/domain/workout-session/workoutSessionDefinitions'

export const profileLabels = {
  title: 'Profil', weight: 'Masa ciała', enable: 'Włącz zapisywanie masy ciała',
  intro: 'Możesz zapisywać pomiary masy ciała i widzieć średnią z 7 dni. To dane o zdrowiu, dlatego potrzebna jest Twoja zgoda.',
  consentTitle: 'Masa ciała w aplikacji',
  notice: [
    'Co zapisujemy: pomiary masy ciała (data i kilogramy) oraz kategorię wagową, jeśli ją podasz.',
    'Po co: żebyś widział średnią z 7 dni i średnie tygodniowe z 12 tygodni. Aplikacja nie ocenia masy ciała, nie liczy BMI i nie podaje „idealnej wagi”.',
    'Gdzie: na Twoim koncie w Firebase (Google Cloud), w regionie Warszawa (europe-central2). Dostęp masz tylko Ty.',
    'To dane o zdrowiu, więc zapisujemy je tylko za Twoją wyraźną zgodą.',
    'Zgodę możesz wycofać w każdej chwili w Profilu. Wycofanie usuwa wszystkie pomiary i kategorię.',
    'Treningi, oceny i RPE działają bez tej zgody.',
  ],
  adult: 'Mam ukończone 18 lat.',
  adultHint: 'Masę ciała mogą zapisywać osoby pełnoletnie. Reszta aplikacji działa bez zmian.',
  agree: 'Zgadzam się na zapisywanie mojej masy ciała i kategorii wagowej na moim koncie.',
  grant: 'Włącz', later: 'Nie teraz', back: 'Wróć do Profilu',
  add: '+ Dodaj pomiar', date: 'Data pomiaru', kilograms: 'Masa ciała (kg)', saveWeight: 'Zapisz pomiar',
  instruction: 'Waż się rano, po toalecie, przed jedzeniem i piciem, w podobnym ubraniu.',
  invalidWeight: 'Podaj masę ciała od 30,0 do 250,0 kg i prawidłową datę, najpóźniej dzisiaj.',
  category: 'Kategoria', setCategory: 'Ustaw kategorię wagową (opcjonalnie)', editCategory: 'Zmień',
  categoryInput: 'Kategoria wagowa (opcjonalnie)', categoryHint: 'Od 1 do 20 znaków, np. „−77 kg”. Puste pole usuwa kategorię.',
  invalidCategory: 'Kategoria może mieć najwyżej 20 znaków.', saveCategory: 'Zapisz kategorię',
  noRecent: 'Brak pomiarów z ostatnich 7 dni.', noWeights: 'Nie masz jeszcze pomiarów masy ciała.',
  noChartWeights: 'Brak pomiarów z ostatnich 12 tygodni.',
  chart: 'Średnie tygodniowe z 12 tygodni', showData: 'Pokaż dane', week: 'Tydzień', average: 'Średnia', measurements: 'Pomiary',
  chartDescription: 'Średnie tygodniowe masy ciała w kilogramach. Oś Y dopasowana do danych, z marginesem. Tydzień bez pomiarów jest przerwą, nie zerem. Bieżący tydzień trwa. Pełne dane w tabeli „Pokaż dane”.',
  chartHint: 'Daty poniedziałków. Przerwa oznacza tydzień bez pomiarów. Bieżący tydzień trwa.',
  noData: 'Brak danych', current: 'trwa', history: 'Lista pomiarów', all: 'Pokaż wszystkie', edit: 'Popraw', remove: 'Usuń',
  deleteTitle: 'Usunąć pomiar?', deleteConfirm: 'Usuń pomiar', withdrawTitle: 'Wycofać zgodę?',
  withdraw: 'Wycofaj zgodę', withdrawConfirm: 'Usuń i wycofaj zgodę', cancel: 'Anuluj',
  onlineRequired: 'Wycofanie wymaga połączenia z internetem, żeby usunąć wszystkie pomiary.',
  withdrawalFailed: 'Nie udało się zakończyć usuwania. Zgoda pozostaje aktywna do końca usuwania. Połącz się z internetem i ponów wycofanie.',
  saveFailed: 'Nie udało się zapisać danych. Sprawdź połączenie i ponów odczyt.',
  loading: 'Wczytywanie danych profilu…', error: 'Nie udało się odczytać lub zapisać danych profilu.',
  incomplete: 'Dane profilu są niepełne. Połącz się z internetem i ponów odczyt.', retry: 'Ponów odczyt',
  statistics: 'Statystyki', lifetime: 'Od początku', recent: 'Ostatnie 4 tygodnie', workouts: 'Treningi',
  duration: 'Czas treningu', rounds: 'Rundy sparingu', total: 'Suma',
  emptyStatistics: 'Statystyki pojawią się po pierwszym treningu.',
  noRecentWorkouts: 'Brak treningów z ostatnich 4 tygodni.',
  saving: 'Zapisywanie…', deleting: 'Usuwanie…',
} as const

export function weightKgLabel(value: number): string { return `${value.toFixed(1).replace('.', ',')} kg` }
export function profileDateLabel(date: string, year = false): string {
  const calendarDate = date.includes('T') ? calculateWorkoutDate(date, Intl.DateTimeFormat().resolvedOptions().timeZone) : date
  const [y, m, d] = calendarDate.split('-')
  return `${Number(d)}.${m}${year ? `.${y}` : ''}`
}
export function profileRangeLabel(start: string, end: string): string {
  return start.slice(0, 7) === end.slice(0, 7)
    ? `${Number(start.slice(8))}–${profileDateLabel(end)}`
    : `${profileDateLabel(start, true)}–${profileDateLabel(end, true)}`
}
export function measurementCountLabel(count: number): string {
  const plural = new Intl.PluralRules('pl').select(count)
  return `${count} ${plural === 'one' ? 'pomiar' : plural === 'few' ? 'pomiary' : 'pomiarów'}`
}

export function formatProfileDurationSecondsPl(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds} s`
  // Round the summed duration once, as in the journal, then split into hours and minutes.
  const minutes = Math.ceil(totalSeconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`
}

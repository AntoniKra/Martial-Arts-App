import { getDisciplineLabelPl } from '@/domain/discipline/disciplineLabels'
import type { RecurringWeek, WeekActivity } from '@/domain/week-plan/weekPlan.types'
import { categoryLabel } from './weekPlanLabels'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'

export function scheduledWeekLabel(weekStart: string) {
  const start = new Date(`${weekStart}T12:00:00.000Z`), end = new Date(`${shiftCalendarDate(weekStart, 6)}T12:00:00.000Z`)
  return new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', timeZone: 'UTC',
    ...(start.getUTCFullYear() !== end.getUTCFullYear() ? { year: 'numeric' as const } : {}),
  }).formatRange(start, end)
}

export const weekdays = [
  { day: 0, short: 'Pn', name: 'Poniedziałek' }, { day: 1, short: 'Wt', name: 'Wtorek' },
  { day: 2, short: 'Śr', name: 'Środa' }, { day: 3, short: 'Cz', name: 'Czwartek' },
  { day: 4, short: 'Pt', name: 'Piątek' }, { day: 5, short: 'Sb', name: 'Sobota' }, { day: 6, short: 'Nd', name: 'Niedziela' },
] as const

export const scheduleLabels = {
  recurring: 'Stały tydzień', recurringEmpty: 'Ustaw stały tydzień — zajęcia, które powtarzają się co tydzień',
  anySection: 'Dowolny dzień · kiedy pasuje', addShort: 'Dodaj', close: 'Zamknij', save: 'Zapisz',
  activityKind: 'Rodzaj pozycji', repeat: 'Powtarzaj co tydzień', repeatHint: 'Dodaje też do stałego tygodnia',
  summary: 'Podsumowanie tygodnia', removeFromWeek: 'Usuń z tego tygodnia',
  savedName: 'Zapisana nazwa',
  recurringHint: 'Pojawią się w każdym tygodniu. Po zajęciach jednym przyciskiem wpiszesz trening.',
  oneWeekHint: 'Zmiana dotyczy tylko tego tygodnia.', recurringFooter: 'Zmiana jednego tygodnia (np. święto) nie zmienia stałego planu.',
  club: 'Zajęcia w klubie', own: 'Trening własny', rest: 'Odpoczynek',
  kinds: { club: 'klub', own: 'własny', rest: 'Odpoczynek' },
  discipline: 'Dyscyplina', days: 'Dni', from: 'Od', to: 'Do', parts: 'Zwykle na zajęciach',
  partsHint: 'Podpowie części przy wpisie po zajęciach; zawsze możesz je zmienić.',
  optional: '(opcjonalnie)', clubName: 'Klub', clubPlaceholder: 'np. nazwa klubu',
  category: 'Rodzaj treningu', linkedPlan: 'Plan z odtwarzacza (opcjonalnie)', noPlan: 'Bez konkretnego planu',
  anyDay: 'Dowolny dzień w tym tygodniu',
  anyHint: 'Treningi własne bez stałego dnia — zrobisz, kiedy pasuje. „Start” uruchamia Twój plan w odtwarzaczu. Zajęcia w klubie nie mają „Start”, tylko wpis po zajęciach.',
  types: 'Rodzaje w tym tygodniu (liczone same)', add: '+ Dodaj trening', addRest: 'Dodaj odpoczynek',
  saveRecurring: 'ZAPISZ STAŁE ZAJĘCIA', saveOwn: 'ZAPISZ TRENING WŁASNY', saveSingle: 'Zapisz w tym tygodniu',
  saveRest: 'ZAPISZ ODPOCZYNEK',
  start: 'Start', entry: 'Wpisz trening', edit: 'Edytuj', remove: 'Usuń', cancel: 'Anuluj', back: '‹ Plan tygodnia',
  backProgress: '‹ Postęp', today: 'DZIŚ', thisWeek: 'ten tydzień',
  week: 'Tydzień',
  move: 'Przenieś na…', moved: 'Przeniesiono trening w tym tygodniu.', undo: 'Cofnij', undoUnavailable: 'Plan zmienił się po przeniesieniu. Cofnięcie jest niedostępne.',
  omit: 'Nie byłem', restore: 'Przywróć', options: 'Opcje treningu',
  statuses: { done: '✓ Zaliczone', planned: '○ Plan', missed: '– Opuszczone', omitted: '✗ Nie byłem', rest: 'Odpoczynek' },
  partial: '(częściowo)', extra: 'Poza planem', goal: 'Cel liczby treningów', goalSave: 'Zapisz cel',
  goalProgress: (count: number, goal: number) => `${count} z ${goal} treningów`,
  remaining: (count: number) => `${count === 1 ? 'został' : count >= 2 && count <= 4 ? 'zostały' : 'zostało'} ${count}`, workoutCount: (count: number) => `Treningi w tygodniu: ${count}`,
  plan: (name: string) => `plan „${name}” · własny`,
  emptyRecurring: 'Nie ma jeszcze stałych zajęć. Dodaj zajęcia w klubie lub trening własny.',
  emptyAny: 'Nie ma treningów bez stałego dnia.',
  saved: 'Zapisano na urządzeniu.', failed: 'Nie udało się odczytać lub zapisać stałego tygodnia. Spróbuj ponownie.',
  incomplete: 'Połącz się z siecią, aby potwierdzić brak stałego tygodnia.',
  invalid: 'Wybierz dzień i uzupełnij poprawnie pola. Godzina końca musi być późniejsza od początku; nazwa klubu ma najwyżej 100 znaków.',
  invalidGoal: 'Cel musi być liczbą całkowitą od 0 do 14.',
  confirmLeave: 'Porzucić niezapisane zmiany?', list: 'Dni planu tygodnia', recurringList: 'Pozycje stałego tygodnia',
  form: 'Dodaj lub edytuj trening', addRecurring: 'Dodaj stałą pozycję',
} as const

export function activityTitle(item: WeekActivity) {
  return item.kind === 'club' ? getDisciplineLabelPl(item.disciplineKey) : item.kind === 'own' ? categoryLabel(item.category) : scheduleLabels.rest
}
export function activityDetail(item: WeekActivity) {
  if (item.kind === 'club') return `${scheduleLabels.kinds.club} · ${item.startTime}–${item.endTime}${item.clubName ? ` · ${item.clubName}` : ''}`
  return item.kind === 'own' ? item.planNameSnapshot ? scheduleLabels.plan(item.planNameSnapshot) : scheduleLabels.kinds.own : ''
}
export function recurringSummary(week: RecurringWeek | undefined) {
  if (!week?.items.length) return scheduleLabels.recurringEmpty
  const club = week.items.filter((item) => item.kind === 'club').length
  const own = week.items.filter((item) => item.kind === 'own').length
  return [...(club ? [`${club}× klub`] : []), ...(own ? [`${own}× trening własny`] : []), 'co tydzień'].join(' · ')
}

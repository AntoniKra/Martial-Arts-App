import { getDisciplineLabelPl } from '@/domain/discipline/disciplineLabels'
import { formatPolishCount } from '@/domain/language/polishPlural'
import type { WeekActivity } from '@/domain/week-plan/weekPlan.types'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import { activityTitle } from '@/features/week-plan/scheduleLabels'

const calendarDate = (date: string) => new Date(`${date}T12:00:00Z`)
export const homeDateLabel = (date: string) => new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(calendarDate(date))
export const homeShortDate = (date: string) => new Intl.DateTimeFormat('pl-PL', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(calendarDate(date))
export function homeWeekLabel(start: string) {
  const end = shiftCalendarDate(start, 6)
  const short = (date: string) => `${date.slice(8)}.${date.slice(5, 7)}`
  return start.slice(0, 7) === end.slice(0, 7) ? `${start.slice(8)}–${short(end)}` : `${short(start)}–${short(end)}`
}
export const homeLabels = {
  heading: 'Start', today: 'Dziś', quickStart: 'Szybki start', activePlan: 'Aktywny plan',
  club: 'Klub', entry: 'Wpisz trening po zajęciach', notGoing: 'Nie idę dziś',
  entryHint: (discipline: string, minutes: string) => `Data, ${discipline.toLocaleLowerCase('pl')}${minutes ? `, ${minutes} min` : ''} i części są już wpisane — dodajesz RPE i notatkę.`,
  usual: (parts: string) => `Zwykle: ${parts}`, noParts: 'Wybierzesz części przy wpisie po zajęciach.',
  later: 'W tym tygodniu jeszcze', otherPlans: 'Stoper i inne plany', allPlans: 'Wszystkie plany i nowy plan',
  startPlan: 'Rozpocznij plan', timer: 'Stoper', clubWorkout: 'Trening w klubie', afterClass: 'wpisz po zajęciach',
  createPlan: 'Utwórz plan', firstClub: 'Wpisz trening z klubu', empty: 'Zacznij swój pierwszy trening',
  emptyHint: 'Utwórz własny plan lub wpisz trening po zajęciach w klubie.',
  overdue: 'Do uzupełnienia', missing: 'nie wpisano', write: 'Wpisz',
  week: 'Ten tydzień', weekPlan: 'Plan tygodnia', days: 'Dni tygodnia',
  flexible: (count: number) => `+ ${formatPolishCount(count, 'trening', 'treningi', 'treningów')} w dowolny dzień`,
  workouts: (count: number) => formatPolishCount(count, 'trening', 'treningi', 'treningów'),
  goal: (count: number, total: number) => `${count} z ${total}`,
  noGoal: 'Nie ustalono celu.', setGoal: 'Ustal cel tygodnia',
  last: 'Ostatnia sesja', history: 'Historia', fillRpe: 'Uzupełnij RPE',
  loadingPlan: 'Ładowanie planu…', loadingSessions: 'Ładowanie sesji…',
  retry: 'Spróbuj ponownie', otherPlansSuffix: 'i inne plany',
  rest: (next: { date: string; item: WeekActivity } | null) => next
    ? `Dziś odpoczynek · następny: ${new Intl.DateTimeFormat('pl-PL', { weekday: 'short', timeZone: 'UTC' }).format(calendarDate(next.date))}, ${activityTitle(next.item).toLocaleLowerCase('pl')}${next.item.kind === 'club' ? ` ${next.item.startTime}` : ''}`
    : 'Dziś odpoczynek',
  discipline: getDisciplineLabelPl,
} as const

export function homeCardDate(date: string, kind: 'club' | 'own' = 'own') {
  const short = new Intl.DateTimeFormat('pl-PL', { weekday: 'short', timeZone: 'UTC' }).format(calendarDate(date)).replace('.', '')
  return `Dziś, ${short} ${date.slice(8)}.${date.slice(5, 7)} · ${kind === 'club' ? 'klub' : 'trening własny'}`
}

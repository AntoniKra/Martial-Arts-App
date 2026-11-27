import { getDisciplineLabelPl } from '@/domain/discipline/disciplineLabels'
import { formatPolishCount } from '@/domain/language/polishPlural'
import type { WeekActivity } from '@/domain/week-plan/weekPlan.types'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import { activityTitle } from '@/features/week-plan/scheduleLabels'
import { exerciseLabels } from '@/features/exercises/exerciseLabels'
import { workoutPlanLabels } from '@/features/workouts/workoutPlanLabels'

const calendarDate = (date: string) => new Date(`${date}T12:00:00Z`)
export const homeDateLabel = (date: string) => new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(calendarDate(date))
export const homeShortDate = (date: string) => new Intl.DateTimeFormat('pl-PL', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(calendarDate(date)).replace(/[.,]+ /, ' ')
export function homeWeekLabel(start: string) {
  const end = shiftCalendarDate(start, 6)
  const short = (date: string) => `${date.slice(8)}.${date.slice(5, 7)}`
  return start.slice(0, 7) === end.slice(0, 7) ? `${start.slice(8)}–${short(end)}` : `${short(start)}–${short(end)}`
}
export const homeLabels = {
  heading: 'Start', today: 'Dziś', quickStart: 'Szybki start', activePlan: 'Aktywny plan',
  club: 'Klub', entry: 'Wpisz trening po zajęciach', moveDay: 'Przenieś dzień',
  entryHint: (discipline: string, minutes: string) => `Data, ${discipline.toLocaleLowerCase('pl')}${minutes ? `, ${minutes} min` : ''} i części są już wpisane — dodajesz RPE i notatkę.`,
  usual: (parts: string) => `Zwykle: ${parts}`, noParts: 'Wybierzesz części przy wpisie po zajęciach.',
  later: 'W tym tygodniu jeszcze', allPlans: 'Wszystkie plany i nowy plan',
  startPlan: 'Rozpocznij plan', timer: 'Stoper', clubWorkout: 'Trening w klubie',
  createPlan: 'Utwórz plan', empty: 'Zacznij swój pierwszy trening',
  emptyHint: 'Utwórz plan treningowy lub wpisz trening po zajęciach w klubie.',
  quickStartHint: 'Utwórz własny plan lub wpisz trening po zajęciach w klubie.',
  firstStep: 'Pierwszy krok', newProfile: 'Nowy profil',
  shortcuts: 'Skróty',
  plansShortcut: { title: workoutPlanLabels.listTitle, description: 'Lista planów treningowych' },
  exercisesShortcut: { title: exerciseLabels.title, description: 'Biblioteka ćwiczeń' },
  wellbeing: 'Jak się dziś czujesz?', wellbeingHint: '4 pytania · ok. 30 s',
  todo: 'Do uzupełnienia', overdueWorkout: 'Zaległy trening', occurred: 'Czy trening się odbył?', write: 'Wpisz',
  overdueBadge: (date: string, discipline: string) => `${homeShortDate(date)} · ${discipline} · klub`,
  rateRpe: 'Oceń trening (RPE)', rateRpeTask: 'Ocena RPE sesji',
  rateRpeHint: (name: string, date: string) => `${name} · ${homeShortDate(date)}`,
  remainingTasks: 'Pozostałe zadania',
  taskCount: (count: number) => formatPolishCount(count, 'zadanie', 'zadania', 'zadań'),
  moreTasks: (count: number) => `+${count} więcej`,
  week: 'Ten tydzień', weekPlan: 'Plan tygodnia', days: 'Dni tygodnia',
  next: 'Następny', flexible: 'W dowolny dzień tego tygodnia',
  flexibleAction: 'Wykonaj w dowolny dzień',
  completed: 'Ukończone:', progress: 'Postęp:',
  units: (count: number) => formatPolishCount(count, 'jednostki', 'jednostek', 'jednostek'),
  goal: (count: number, total: number) => `${count} z ${total}`,
  setGoal: 'Bez celu · Ustal cel tygodnia',
  last: 'Ostatnia sesja', history: 'Historia',
  loadingPlan: 'Ładowanie planu…', loadingSessions: 'Ładowanie sesji…',
  retry: 'Spróbuj ponownie',
  rest: (next: { date: string; item: WeekActivity } | null) => next
    ? `Dziś odpoczynek · następny: ${new Intl.DateTimeFormat('pl-PL', { weekday: 'short', timeZone: 'UTC' }).format(calendarDate(next.date))}, ${activityTitle(next.item).toLocaleLowerCase('pl')}${next.item.kind === 'club' ? ` ${next.item.startTime}` : ''}`
    : 'Dziś odpoczynek',
  discipline: getDisciplineLabelPl,
} as const

export function homeCardDate(date: string) {
  return `Dziś · ${new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(calendarDate(date))}`
}

/** Narrow phones (below 390 px): one-line form chosen by the owner, e.g. "Dziś · czw, 19 lis". */
export function homeCardDateShort(date: string) {
  const day = calendarDate(date)
  const weekday = new Intl.DateTimeFormat('pl-PL', { weekday: 'short', timeZone: 'UTC' }).format(day).replace('.', '')
  return `Dziś · ${weekday}, ${new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(day)}`
}

import type { WorkoutSessionCategory } from '@/domain/workout-session/workoutSession.types'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import type { WeekPlanItem } from '@/domain/week-plan/weekPlan.types'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'

export const WEEK_PLAN_CATEGORIES: readonly WorkoutSessionCategory[] = ['technique', 'pads', 'bag', 'sparring', 'conditioning', 'strengthAndConditioning', 'mixed']
export function categoryLabel(category: WorkoutSessionCategory) { return category === 'mixed' ? 'Mieszany' : getWorkoutBlockLabelPl(category) }
export function weekItemLabel(item: WeekPlanItem) { return item.kind === 'plan' ? item.planNameSnapshot : categoryLabel(item.category) }
export function weekLabel(weekStart: string) { return `${formatDate(weekStart)} – ${formatDate(shiftCalendarDate(weekStart, 6))}` }
function formatDate(date: string) { const [year, month, day] = date.split('-'); return `${day}.${month}.${year}` }

export const weekPlanLabels = {
  title: 'Plan tygodnia', details: 'Szczegóły planu tygodnia', arrange: 'Ułóż plan tygodnia',
  edit: 'Edytuj plan tygodnia', save: 'Zapisz plan tygodnia', saved: 'Plan zapisany na urządzeniu.',
  historical: 'Plan zmieniony po zakończeniu tygodnia',
  empty: 'Nie ustalono celu na ten tydzień.', loading: 'Ładowanie planu tygodnia…',
  error: 'Nie udało się odczytać lub zapisać planu tygodnia. Sprawdź dane i spróbuj ponownie.',
  incomplete: 'Nie można potwierdzić braku planu. Połącz się z siecią i spróbuj ponownie.',
  outsideRange: 'Ten tydzień jest poza dostępnym zakresem historii.',
  sessionsUnavailable: 'Nie można jeszcze obliczyć realizacji: dane treningów są niepełne lub niedostępne.',
  retrySessions: 'Ponów odczyt treningów',
  retry: 'Spróbuj ponownie', current: 'Bieżący tydzień', previous: 'Poprzedni tydzień', next: 'Następny tydzień',
  completed: 'Ukończone', partial: 'Częściowe', unfulfilled: 'Niewykonane', extra: 'Dodatkowe',
  add: 'Dodaj pozycję', choose: 'Wybierz plan lub rodzaj', limit: 'Plan może zawierać najwyżej 14 pozycji. Nie dodano żadnej pozycji.',
  cancel: 'Anuluj edycję', copy: 'Skopiuj z poprzedniego tygodnia', selectAll: 'Zaznacz cały plan',
  copySelected: 'Dodaj wybrane do tego planu', copyHint: 'Kopiujesz wybrane cele, również ukończone. Treningi i statusy zostają w poprzednim tygodniu.',
  noCopy: 'Poprzedni tydzień nie ma pozycji do skopiowania.', unavailable: 'Plan niedostępny',
  libraryUnavailable: 'Lista planów treningowych jest niepełna. Nadal możesz dodawać rodzaje treningów.',
  changed: 'Plan zmienił się podczas edycji. Zachowano szkic; anuluj edycję i odczytaj aktualny plan przed zapisem.',
  failed: 'Nie udało się zapisać planu. Szkic pozostaje w formularzu.',
  noItems: 'Lista jest pusta. Dodaj plan lub rodzaj treningu.',
  removedGoal: 'Lista jest pusta. Zapis usunie cel, zachowując treningi w dzienniku.',
} as const

import type { PlanWorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { formatSecondsAsClock } from '@/domain/time/formatDuration'

export const workoutFeedbackLabels = {
  title: 'Podsumowanie',
  savedEntry: 'Wpis jest już w dzienniku. Oceny dopisują się do niego.',
  status: { completed: 'Trening ukończony', partial: 'Trening częściowy' },
  metrics: ['Trening', 'Praca', 'Ćwiczenia'],
  previousPlanRun: (date: string) => `Poprzednio ten plan: ${date}`,
  previousPlanRunRpe: (rpe: number | null) => `RPE: ${rpe ?? 'brak'}`,
  viewPreviousPlanRun: 'Zobacz',
  planChanged: 'Plan zmieniono po tamtym treningu.',
  focusHeading: 'Ćwiczenia celu',
  sparringIntensity: (number: number) => `Sparing ${number} · intensywność (opcjonalnie)`,
  assessed: (count: number, total: number) => `oceniono ${count} z ${total}`,
  criterion: 'Kryterium',
  focusQuestion: 'Jak wyszło kryterium?',
  focusScale: [
    'Nie udaje się nawet w prostej próbie.',
    'Udaje się czasem, zwykle przerywam, żeby poprawić.',
    'Udaje się, gdy świadomie pilnuję wskazówki.',
    'Zwykle się udaje, błąd sam łapię i poprawiam.',
    'Udaje się bez myślenia o wskazówce.',
  ],
  unable: 'Nie umiem ocenić',
  clearAssessment: 'Wyczyść ocenę',
  skipped: 'Pominięte — bez oceny',
  todayQuestion: 'Jak było dziś?',
  checks: { better: 'Lepiej', same: 'Bez zmian', notChecked: 'Nie sprawdzono' },
  previous: (date: string) => `Notatka z ${date}`,
  forToday: (date: string) => `Na dziś · z treningu ${date}`,
  problem: 'Problem',
  fix: 'Poprawka',
  newCorrection: 'Nowa notatka: problem i poprawka',
  correctionHeading: 'Notatka: jeden problem i jedna poprawka',
  problemPlaceholder: 'np. po uniku robię krok w tył',
  fixPlaceholder: 'np. kontra z miejsca, ciężar na przedniej nodze',
  correctionHint: 'Przy następnym treningu z tym ćwiczeniem zapytamy, czy jest lepiej.',
  previewHint: 'Po treningu zapytamy, czy jest lepiej.',
  othersHeading: (count: number) => `Oceń pozostałe ćwiczenia · ${count}, opcjonalnie`,
  otherQuestion: 'Jak oceniasz wykonanie tego ćwiczenia?',
  otherScale: [
    'Nie udało się wykonać zgodnie z założeniem.',
    'Dużo błędów i mała kontrola.',
    'Częściowo poprawnie, ale nierówno.',
    'Dobrze i powtarzalnie.',
    'Bardzo dobrze, swobodnie i pod kontrolą.',
  ],
  noteHeading: 'Notatka do treningu · opcjonalnie',
  notePlaceholder: 'Co zadziałało? Jaki błąd się powtarzał? Co zrobić następnym razem?',
  done: 'Gotowe',
  back: 'Wróć do historii',
  backToPlan: 'Wróć do planu',
  loading: 'Ładowanie podsumowania…',
  unavailable: 'Nie znaleziono podsumowania',
  loadError: 'Nie udało się wczytać podsumowania.',
  saveError: 'Nie udało się zapisać ocen. Spróbuj ponownie.',
  correctionError: 'Problem i poprawka muszą mieć po 1–200 znaków.',
  noteError: 'Notatka może mieć do 1000 znaków.',
} as const

export function formatWorkoutFeedbackMetrics(session: PlanWorkoutSession): string[] {
  return [formatSecondsAsClock(Math.floor(session.durationSeconds)), formatSecondsAsClock(session.workSeconds), `${session.completion.completed}/${session.completion.planned}`]
}

export function formatCorrectionDate(date: string): string {
  return new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${date}T12:00:00Z`))
}

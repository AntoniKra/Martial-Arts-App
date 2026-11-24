export const workoutHistoryLabels = {
  completedAt: 'zakończenie',
  duration: 'Czas trwania',
  rpe: 'Odczucie RPE',
  shortRpe: (value: number) => `RPE ${value}`,
  exercises: 'Ćwiczenia',
  roundCompletion: 'Ukończenie rund',
  metrics: 'Parametry treningu',
  details: 'Szczegóły wpisu',
  note: 'Notatka',
  athleteNote: 'Notatka zawodnika',
  report: 'Raport treningu',
} as const

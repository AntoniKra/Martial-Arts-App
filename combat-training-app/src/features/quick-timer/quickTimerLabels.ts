export const quickTimerLabels = {
  title: 'Szybki stoper', category: 'Rodzaj treningu', discipline: 'Dyscyplina',
  format: 'Gotowy format', custom: 'Własny', customDescription: 'ustawiasz sam',
  formatRest: (time: string) => `przerwa ${time}`,
  rounds: 'Liczba rund', work: 'Czas pracy', rest: 'Przerwa', total: 'Łączny czas',
  decrease: (label: string) => `Zmniejsz: ${label}`,
  increase: (label: string) => `Zwiększ: ${label}`,
  start: 'Start', back: 'Wróć do ustawień', roundsMetric: 'Rundy',
  iphone: 'Na iPhonie gong nie zagra przy wyciszonym telefonie ani zablokowanym ekranie. Czas liczy się poprawnie.',
  intensity: 'Intensywność sparingu', optional: 'Opcjonalnie',
  previousCategoryHint: 'Ustawione jak ostatnio – zmień, jeśli trzeba',
  firstCategoryHint: 'Ustawione domyślnie – zmień, jeśli trzeba',
} as const

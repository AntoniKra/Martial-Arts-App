# Wake Lock

`browserScreenWakeLock.ts` implementuje interfejs `ScreenWakeLockService` z `application/wake-lock`. Żąda blokady ekranu dla widocznej karty, ponawia żądanie po `visibilitychange` i zwalnia blokadę przy `dispose()`. Spóźniona odpowiedź po wyjściu z odtwarzacza jest również zwalniana.

Hook odtwarzacza utrzymuje usługę od otwarcia poprawnie załadowanego treningu do zakończenia lub wyjścia, również w pauzie. Brak API, brak bezpiecznego kontekstu, odmowa i błąd zwalniania blokady są obsługiwane bez komunikatu i bez przerywania treningu.

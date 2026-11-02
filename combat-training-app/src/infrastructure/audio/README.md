# Audio

`webAudioWorkoutGong.ts` implementuje interfejs `WorkoutGong` z `application/audio`. Sygnały powstają przez Web Audio API, bez plików i licencji zewnętrznych: pojedynczy niższy gong końca pracy, dwa wyższe uderzenia startu pracy i trzy rosnące uderzenia końca treningu.

`unlock()` tworzy i wznawia kontekst oraz uruchamia cichy bufor bezpośrednio w obsłudze kliknięcia „Rozpocznij trening” lub „Wznów”. `dispose()` zamyka kontekst. Brak API lub odmowa odtwarzania nie przerywa timera. Opóźnione wznowienie kontekstu nie odtwarza kolejki starych sygnałów.

Wybór sygnału i scalenie zdarzeń nadrobionych kroków należą do modułu odtwarzacza. Adapter nie zna osi treningu.

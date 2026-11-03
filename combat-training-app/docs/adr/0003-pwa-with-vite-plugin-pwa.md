---
status: accepted
---

# PWA z vite-plugin-pwa i aktualizacją na żądanie

Wybieramy `vite-plugin-pwa` 2.0.0 zgodny z Vite 8 oraz Workbox w trybie `generateSW`, aby generować manifest i wstępnie zapisywać powłokę aplikacji, ikony oraz lokalne fonty WOFF2 bez utrzymywania własnego service workera. Nawigacja offline korzysta z `index.html`, stare pamięci podręczne są czyszczone, a zapytania API nie są zapisywane (brak `runtimeCaching`); pełna synchronizacja danych offline pozostaje poza zakresem. Stosujemy `registerType: 'prompt'`: nowa wersja czeka na przycisk „Odśwież”, a na trasie `/workouts/:workoutId/active` komunikat i wywołanie aktualizacji są blokowane, aby nie przerwać treningu. Service worker jest wyłączony w trybie deweloperskim. Ikony są tymczasowe do zatwierdzenia docelowego logo.

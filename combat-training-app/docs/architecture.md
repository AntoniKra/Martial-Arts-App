# Architektura aplikacji

## Zasada modularności

Kod jest organizowany według funkcji domenowych. Nie tworzymy jednego katalogu pełnego przypadkowych komponentów ani warstw enterprise bez potrzeby.

```text
src/
├── app/                 konfiguracja, router, providery
├── application/         interfejsy repozytoriów i usług, konteksty danych
├── components/          współdzielone UI i layout
├── domain/              stabilne typy i czyste obliczenia
├── features/            moduły funkcjonalne
├── infrastructure/      Firebase, audio, Wake Lock, storage
├── pages/               komponenty tras
├── styles/
└── test/
```

## Granice odpowiedzialności

- komponent UI nie wywołuje Firebase;
- logika czasu i średnich nie znajduje się w JSX;
- typy domenowe nie zależą od Reacta;
- infrastruktura implementuje interfejsy repozytoriów i usług z `src/application`;
- mocki i seed nie są źródłem prawdy po podłączeniu bazy;
- kod prototypu Figmy nie definiuje architektury produkcyjnej.

Wspólne typy odtwarzania, czysta funkcja `createWorkoutPlaybackTimeline` oraz neutralne wartości przygotowania (5/10/15/30 s, domyślnie 10 s) znajdują się w `src/domain/workout-playback/`. Warstwy application i infrastructure importują je bezpośrednio z domeny. Etykiety opcji przygotowania i stan ładowania strony pozostają w `features/workout-player`.

Warstwa `src/application/` definiuje interfejsy repozytoriów planów, sesji, ćwiczeń celu, planów tygodnia i aktywnego treningu oraz usług uwierzytelniania, gongu i Wake Lock. Zawiera też konteksty `WorkoutDataContext` i `WorkoutGongContext` oraz hooki subskrypcji danych.

### Znany dług techniczny

Granica między funkcjami a infrastrukturą nie jest wszędzie zachowana. Bezpośrednie importy z `src/infrastructure/` występują w:

- `features/workout-details/components/WorkoutPlanDetailsView.tsx` i `features/workout-player/components/WorkoutPlayerView.tsx`: pamięć ustawienia przygotowania;
- `features/workout-player/ActiveWorkoutGate.tsx`: lokalny zapis aktywnego treningu;
- `features/home/components/RpeReminder.tsx` i `features/workout-feedback/WorkoutRpeSummary.tsx`: pamięć odłożenia przypomnienia RPE;
- `features/workout-player/hooks/useWorkoutScreenWakeLock.ts`: implementacja przeglądarkowego Wake Lock.

Ponadto `features/theme/themeStorage.ts` czyta i zapisuje motyw bezpośrednio w `localStorage`. To opis istniejących odstępstw od docelowej architektury; ich usunięcie wymaga osobnego zadania.

## Podział kodu

Trasy kreatora (`/workouts/new`, `/workouts/:workoutId/edit`), odtwarzacza (`/workouts/:workoutId/active`), podsumowania (`/workout-sessions/:sessionId/feedback`), szczegółów planu (`/workouts/:workoutId`) oraz Postępu (`/progress`, `/progress/week/:weekStart`, `/progress/focus-skills/:focusSkillId`) korzystają z `lazy` React Routera i eksportu `Component` (kontynuacja ADR 0009). Te ekrany nie są potrzebne przy zwykłym starcie aplikacji. Logowanie, weryfikacja, Home, lista treningów, bramki, providery i układ pozostają w głównej paczce. `ActiveWorkoutGate` zachowuje statyczną logikę odzyskiwania treningu, a Home i historia wspólne etykiety; nie importują widoków leniwych ekranów. Początkowe ładowanie trasy używa tego samego ekranu co sprawdzanie sesji, a nadrzędny ekran błędu obsługuje także nieudany import. Pliki tras trafiają do precache PWA, aby były dostępne offline po pierwszej wizycie. Budżet głównej paczki to około **200 kB gzip**; każdy PR dodający ekran powinien podawać pomiar przed i po oraz rozmiary nowych plików.

Ręczny wpis treningu korzysta z dwóch leniwych tras: `/workout-sessions/new` i `/workout-sessions/:sessionId/edit`, współdzielących `ManualWorkoutPage` z eksportem `Component`. Formularz, karta oceny celu i skala RPE są ładowane poza głównym plikiem. Błędy importu obsługuje nadrzędny ekran błędu, a nowe pliki trafiają do precache PWA. Czysta walidacja dat, czasu, ocen i dubli znajduje się w `src/domain/workout-session/manualWorkoutEntry.ts`; pełny dokument sprawdza `zod/mini` na granicy infrastruktury. `saveManual` zapisuje wpis oraz zmiany otwartych notatek jednym `writeBatch`; potwierdzenie pochodzi z lokalnych subskrypcji, bez czekania na serwer.

## Stan

- routing: React Router;
- dane z Firestore: subskrypcje `onSnapshot` w repozytoriach i mały własny hook, bez TanStack Query (ADR 0007);
- formularze: kontrolowane pola Reacta i walidacja w czystej funkcji ze schematami `zod/mini` (ADR 0006);
- kreator: reducer lub wyspecjalizowany hook domenowy;
- aktywny timer: osobny moduł stanów, nie ogólny globalny store;
- szkic lokalny: storage adapter.

## Istniejące moduły

- `features/focus-skills`: tworzenie, edycja i wybór ćwiczeń celu z kryterium w kreatorze planu;
- `features/progress`: lista ćwiczeń celu i wykresy ich ocen na ekranach `ProgressPage` i `FocusSkillProgressPage`;
- `features/week-plan`: edycja planu tygodnia i prezentacja jego realizacji; szczegóły pokazuje `WeekPlanPage`;
- `features/weekly-summary`: podsumowanie liczby treningów, czasu treningu, pracy i sparingu, obciążenia z RPE oraz wykres tygodni na ekranie `WeekPlanPage`.

## Rozbudowa

Nowe moduły przyszłe trafiają do `features`, np.:

- `readiness`;
- `athlete-profile` (waga i statystyki);
- `control-tests`;
- `analytics` (dalsze analizy);
- `strength-training` i `combination-builder` w kierunkach rozwoju.

Nie dodawaj pustych abstrakcji wyłącznie „na przyszłość”. Model ma nie blokować rozbudowy, ale implementujemy tylko potrzebne interfejsy.

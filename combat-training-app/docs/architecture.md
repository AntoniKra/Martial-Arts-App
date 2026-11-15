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

Issue #149: walidacja i kopiowanie części zajęć pozostają w domenie, a `manualWorkoutParts.ts` udostępnia zgodnościowe mapowanie rodzaju. `workoutDocumentVersion` w infrastrukturze wybiera wersję 2 tylko dla ręcznego wpisu z częściami; odczyt nie migruje historii (ADR 0016). Postęp i Profil współdzielą prezentację liczników części oraz minut z `calculateProfileStatistics`, z objaśnieniem zakresu minut. Startowy JS w takich samych lokalnych buildach bez `.env` (suma gzip skryptów i modulepreload z `dist/index.html`, istniejący `measureBundle`): **171 003 B przed → 171 432 B po**, wzrost **429 B**, poniżej budżetu około 200 kB. Bez nowych zależności.

Profil ma osobne leniwe trasy `/profile` (`ProfilePage`) i `/profile/consent` (`ProfileConsentPage`) z eksportem `Component`. Widoki, formularze, statystyki i SVG nie trafiają do głównego pliku; oba ekrany są w precache PWA i korzystają z istniejącej obsługi błędów importu. `WorkoutDataProvider` słucha dokumentu profilu zawsze po zalogowaniu, a pomiarów tylko przy zgodzie; oba źródła obejmuje ostrzeżenie `SignOutButton` o niewysłanych danych. Czyste obliczenia i podział wycofania na partie znajdują się w `src/domain/profile`, interfejsy repozytoriów w `src/application/profile`, a schematy i integracja Firestore w infrastrukturze. Pomiar startowego JS w PR obejmuje główny plik oraz jego statyczne zależności ładowane na starcie, zgodnie z pomiarem 167,08 kB gzip sprzed issue #100.

## Stan

- routing: React Router;
- dane z Firestore: subskrypcje `onSnapshot` w repozytoriach i mały własny hook, bez TanStack Query (ADR 0007);
- formularze: kontrolowane pola Reacta i walidacja w czystej funkcji ze schematami `zod/mini` (ADR 0006);
- kreator: reducer lub wyspecjalizowany hook domenowy;
- aktywny timer: osobny moduł stanów, nie ogólny globalny store;
- szkic lokalny: storage adapter.

## Moje ćwiczenia (issue #156)

`domain/exercise` zawiera prywatną definicję, normalizację wyszukiwania, wybór sekcji i kontrolę odwołań; `application/exercise` udostępnia interfejs repozytorium. Schemat `zod/mini`, reguły i adapter Firestore obsługują kolekcję `exercises`, włączoną do wspólnego cyklu subskrypcji, ponawiania, oczekujących zapisów, wylogowania, eksportu i usunięcia konta. Ekran zarządzania `/exercises` jest leniwy, a formularz współdzieli z kreatorem moduł `features/exercises`. Definicja nie zastępuje wystąpienia w planie ani celu z kryterium. Trend pozostaje po `focusSkillId`; ADR 0017 opisuje opcjonalne `exerciseId`, wersje dokumentów i zachowanie migawek bez migracji historii.

Pomiar porównawczy (`git show HEAD` dla bazowych źródeł `ac0618a`, bez nowych zależności, te same narzędzia budowania i `node:zlib.gzipSync`, suma unikalnych skryptów oraz modulepreload wskazanych w `index.html`): **171 551 B przed → 172 148 B po**, wzrost **597 B**; budżet około 200 kB zachowany. Wyniki budowania i zrzuty QA pozostają poza repozytorium.

## Istniejące moduły

- `features/focus-skills`: tworzenie, edycja i wybór ćwiczeń celu z kryterium w kreatorze planu;
- `features/progress`: lista ćwiczeń celu i wykresy ich ocen na ekranach `ProgressPage` i `FocusSkillProgressPage`;
- `features/week-plan`: edycja planu tygodnia i prezentacja jego realizacji; szczegóły pokazuje `WeekPlanPage`;
- `features/weekly-summary`: podsumowanie liczby treningów, czasu treningu, pracy i sparingu, obciążenia z RPE oraz wykres tygodni na ekranie `WeekPlanPage`.
- `features/profile`: pomiary masy ciała i kategoria za zgodą 18+, wykres średnich tygodniowych, wycofanie online oraz statystyki dziennika bez zgody.

## Rozbudowa

Nowe moduły przyszłe trafiają do `features`, np.:

- `readiness`;
- `control-tests`;
- `analytics` (dalsze analizy);
- `strength-training` i `combination-builder` w kierunkach rozwoju.

Nie dodawaj pustych abstrakcji wyłącznie „na przyszłość”. Model ma nie blokować rozbudowy, ale implementujemy tylko potrzebne interfejsy.

### Szybki stoper (issue #105)

`/quick-timer` (`QuickTimerPage`) i `/quick-timer/active` (`QuickTimerPlayerPage`) są leniwymi trasami. Druga współdzieli `WorkoutPlayerView` z planem i pozostaje poza `AppLayout`. W paczce startowej jest małe natywne okno „Nowy” bez nowych zależności; konfiguracja, formularz, ustawienia i podsumowanie stopera ładują się z trasami. Pliki są w precache PWA. Czysta konfiguracja i jednorazowy plan znajdują się w `domain/quick-timer`, wspólne formaty rund w `domain/workout/roundFormatPresets.ts`, a ustawienia konta na urządzeniu w `infrastructure/storage/quickTimerStorage.ts` (walidacja `zod/mini`). Przygotowanie i sygnał 10 s używają istniejących magazynów urządzenia.

Pomiar startowego JS (suma gzip pliku wejściowego i statycznych zależności wskazanych w `dist/index.html`, `node:zlib.gzipSync`, te same warunki `npm run build`): **165,366 kB przed → 167,339 kB po**, wzrost **1,973 kB** (około 1,19%). Nowe leniwe pliki: `QuickTimerPage` 2,441 kB gzip, `QuickTimerPlayerPage` 0,668 kB oraz współdzielone `QuickTimerCategoryField` 0,589 kB; odtwarzacz korzysta ze wspólnego pliku `WorkoutPlayerView`. Bez nowych zależności i bez zmian budżetu około 200 kB gzip.

### Eksport i usunięcie konta (issue #101)

Trasa `/profile/delete-account` ładuje leniwie `DeleteAccountPage`; sekcja „Twoje dane” należy do leniwego Profilu. Generatory JSON/CSV i pobieranie plików są importowane dopiero po wybraniu eksportu. `AccountService` w application oddziela UI od Firebase, a sekwencja `deleteAccount` kończy sprzątanie również po utracie sesji i odmontowaniu trasy. AuthProvider odbiera wynik przekierowania Google raz i udostępnia `operationType` oraz błąd; trasa sprawdza zgodny znacznik i wymaga osobnego końcowego przycisku. Jednorazowy komunikat sukcesu i ewentualny błąd sprzątania działają niezależnie od stanu nawigacji.

Pomiar porównawczy dla konfiguracji emulatorów demo, gzip poziom 6, suma pliku wejściowego i rekurencyjnych statycznych importów z manifestu Vite: **167,03 kB przed → 167,89 kB po** (+0,86 kB; 167 026 → 167 887 B). Punkt bazowy: `ed53dfa`. Sam plik wejściowy zmienił się z 165,51 do 155,04 kB, ponieważ bundler wydzielił współdzielone schematy do statycznych zależności; nie oznacza to spadku całego startowego JS. Nowe leniwe pliki gzip: `DeleteAccountPage` 1,45 kB, `dataExport` 1,05 kB, `firebaseAccountService` 1,00 kB, `AccountExportButtons` 2,51 kB, `accountDeletionStorage` 0,85 kB. Żaden z nich nie należy do startowych statycznych importów. Surowych manifestów i pomiarów nie wersjonujemy.

Po połączeniu #101 i #105 (scalenie `main` do gałęzi #110, 13.11): startowy JS **168,56 kB** gzip (suma pliku wejściowego i skryptów wskazanych w `dist/index.html`, `node:zlib.gzipSync`), budżet ok. 200 kB.

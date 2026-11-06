# Wstępny model danych

Dokument opisuje kierunek. Ostateczne migracje tworzymy dopiero po zatwierdzeniu modelu w kodzie domenowym.

> **Backend zmieniony na Firebase (`adr/0004-firebase-as-baas.md`).** Model zaprojektujemy jako dokumenty Firestore pod `users/{uid}/…` w drugiej rundzie ustaleń. Tabele SQL poniżej to historyczny punkt wyjścia.
>
> **Do przeprojektowania (listopad 2026).** Model powstał przed kartą tematu. Wersja finalna zakłada jeden typ wpisu w dzienniku dla trzech źródeł treningu (szybki stoper, plan, ręczny wpis), cele, profil z historią wagi oraz logowanie e-mailem, hasłem i kontem Google zamiast anonimowego konta (`adr/0002-email-password-and-google-auth.md`). Schemat zaprojektujemy w drugiej rundzie ustaleń i zapiszemy w ADR. Do tego czasu traktuj tabele poniżej jako punkt wyjścia.

## Lokalny storage — WorkoutSession

W aplikacji lokalny envelope sesji jest oddzielony od planów:

- klucz namespaced, niezależny od `workout-plans`;
- bieżący `schemaVersion: 3`; odczyt także v1 i v2;
- `sessions: WorkoutSession[]`.

### v1

- przechowuje wyłącznie ukończone sesje bez pola `note`;
- odczyt normalizuje każdą sesję do `note: null` w pamięci;
- sam odczyt nie migruje dokumentu do v2.

### v2

- wymaga pola `note: string | null` w każdej sesji;
- nowe zapisy, `updateNote` i `delete` zapisują envelope `schemaVersion: 2`;
- notatka jest normalizowana: trim, pusty tekst → `null`, maksymalnie 1000 znaków.

### v3

- zapisuje źródło, status `completed` lub `partial`, czas treningu, pracy i sparingu, licznik ukończonych i zaplanowanych ćwiczeń, kategorię, lokalny dzień startu i strefę IANA (ADR 0005);
- odczyt v1/v2 wylicza nowe pola z `stepResults`, zachowuje notatkę i wyniki etapów; do pracy liczy wyłącznie ćwiczenia `completed`, a do czasu treningu także zapisany czas historycznych etapów `partial`;
- odczyt próbuje utrwalić pełny envelope v3; błąd zapisu migracji nie blokuje zwrócenia zmigrowanych wpisów i powoduje ponowienie przy kolejnym odczycie; nie usuwa dawnych wpisów bez pracy;
- strefa historyczna jest przybliżana strefą urządzenia przy pierwszej migracji; czasu dawnych powtórzeń nie da się odtworzyć;
- nowe zapisy, `updateNote` i `delete` używają v3; ręczny schemat pozostaje zgodny z ADR 0006.

Storage przechowuje zapisane sesje ukończone i częściowe. Brak draftów, porzuconych treningów, RPE, ocen i feedbacku.

Każda sesja zawiera snapshot planu i wyniki kroków (`stepResults`) z outcome `completed`, `partial` lub `skipped`.

`activeDurationSeconds` podsumowania korzysta w v3 z `durationSeconds`; unikalne wyniki kroków nie zawierają całego czasu powtórzeń.

Instrukcje ćwiczeń nie są zapisywane w storage v1, jeżeli nie są potrzebne do historii i podsumowania.

## `workouts`

- `id uuid`;
- `user_id uuid`;
- `status text` — draft/planned/in_progress/completed;
- `discipline_key text`;
- `custom_name text null`;
- `name_snapshot text`;
- `main_goal text null`;
- `created_at timestamptz`;
- `started_at timestamptz null`;
- `completed_at timestamptz null`;
- czasy planowane i rzeczywiste;
- feedback całej jednostki.

## `workout_blocks`

- `id uuid`;
- `workout_id uuid`;
- `block_type text`;
- `position integer`.

## `workout_items`

Wspólna oś elementów bloku:

- `id uuid`;
- `workout_block_id uuid`;
- `item_type text` — exercise/break;
- `position integer`;
- `exercise_mode text null` — rounds/continuous/strength;
- `combination_id uuid null`;
- `exercise_key text null`;
- `exercise_name_snapshot text null`;
- `instruction text null`;
- `rounds integer null`;
- `round_duration_seconds integer null`;
- `rest_between_rounds_seconds integer null`;
- `duration_seconds integer null`;
- rzeczywiste wykonanie: completed/skipped/partial, ukończone rundy, czasy;
- `execution_rating smallint null`.

## Biblioteka

### `combinations`

- `id uuid`;
- `combination_key text unique`;
- `name_pl text`;
- `name_en text null`;
- `is_system boolean`;
- `created_by uuid null`;
- `is_active boolean`.

### `combination_disciplines`

- `combination_id uuid`;
- `discipline_key text`.

### `combination_block_types`

- `combination_id uuid`;
- `block_type text`.

## Przyszły tryb siłowy

### `strength_sets`

- `id uuid`;
- `workout_item_id uuid`;
- `position integer`;
- `planned_weight_kg numeric null`;
- `planned_repetitions integer`;
- `actual_weight_kg numeric null`;
- `actual_repetitions integer null`;
- `status text`.

## Bezpieczeństwo

- wszystkie dane użytkownika leżą pod `users/{uid}/…`;
- użytkownik zakłada konto e-mailem i hasłem albo loguje się kontem Google (`adr/0002-email-password-and-google-auth.md`) i otrzymuje własny identyfikator (`uid`) z Firebase Authentication;
- reguły bezpieczeństwa Firestore muszą uniemożliwić odczyt i zapis cudzych danych, a ich testy działają na emulatorze;
- strukturę dokumentów sprawdzamy na granicy infrastruktury i oznaczamy polem `schemaVersion`;
- komponenty React nie wywołują Firebase bezpośrednio.
